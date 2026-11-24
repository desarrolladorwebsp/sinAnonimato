// @vitest-environment node
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { Connection, Database } from "@/lib/authorizations/db";
import { seal, unseal } from "@/lib/authorizations/crypto";
const state = vi.hoisted(() => ({ db: null as unknown as Database, jar: new Map<string,string>(), after: vi.fn() }));
vi.mock("@/lib/authorizations/db", () => ({ database: () => state.db }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (key:string) => state.jar.has(key) ? { value: state.jar.get(key) } : undefined, set: (key:string,value:string) => { if(value) state.jar.set(key,value); else state.jar.delete(key); } }) }));
vi.mock("next/server", () => ({ after: state.after }));
vi.mock("@/lib/auth", () => ({ requireAdmin: async (headers:Headers, write = false) => {
  if(!["yes", "production"].includes(headers.get("x-fixture-admin") ?? "")) { const { AuthorizationError } = await import("@/lib/authorizations/config"); throw new AuthorizationError(401,"Acceso requerido"); }
  const role = headers.get("x-fixture-admin") === "production" ? "production" : "admin";
  if (write && role !== "admin") { const { AuthorizationError } = await import("@/lib/authorizations/config"); throw new AuthorizationError(403,"Solo administración"); }
  return { email: "admin@example.test", role };
} }));
import { POST, GET } from "@/app/api/authorizations/[...path]/route";
const pg = new PGlite();
function connection(target: Pick<PGlite,"query">):Connection { return { async query<T extends Record<string,unknown>>(sql:string, values?:unknown[]) { const r=await target.query<T>(sql,values); return {rows:r.rows,rowCount:r.affectedRows}; } }; }
beforeAll(async () => {
  vi.stubEnv("APP_URL","http://localhost:3000"); vi.stubEnv("AUTHORIZATION_ENCRYPTION_KEY","a".repeat(64)); vi.stubEnv("AUTHORIZATION_RETENTION_DAYS","365"); vi.stubEnv("AUTHORIZATION_RETENTION_POLICY","Conservación ficticia de prueba"); vi.stubEnv("PRODUCTION_EMAIL","production@example.test");
  state.db={...connection(pg),transaction:work=>pg.transaction(tx=>work(connection(tx)))};
  for(const name of ["001_authorizations.sql","002_indefinite_retention.sql","003_production_confirmation.sql","004_reviews.sql","005_episode_schedule.sql","006_episode_formats.sql","007_calendar_management.sql"]) await pg.exec(await readFile(`migrations/${name}`,"utf8"));
});
beforeEach(async()=>{ state.jar.clear();state.after.mockClear();await pg.exec("TRUNCATE sa_events,sa_outbox,sa_authorizations,sa_documents,sa_rate_limits,sa_reviews,sa_episode_schedule CASCADE"); });
afterAll(async()=>{ await pg.close();vi.unstubAllEnvs(); });
async function call(path:string,input?:object,admin: boolean | "production" = false) {
  const request=new Request(`http://localhost:3000/api/authorizations/${path}`,{method:input ? "POST":"GET",headers:{Origin:"http://localhost:3000","Content-Type":"application/json",...(admin ? {"x-fixture-admin":admin === true ? "yes" : admin}: {})},body:input ? JSON.stringify(input):undefined});
  return (input?POST:GET)(request,{params:Promise.resolve({path:path.split("/")})});
}
async function mailToken(kind:string) {
 const r=await pg.query<{id:string;payload:string}>("SELECT id,payload FROM sa_outbox WHERE kind=$1 ORDER BY created_at DESC LIMIT 1",[kind]);
 return new URL(JSON.parse(unseal(r.rows[0].payload,`mail:${r.rows[0].id}`)).url).hash.slice(1);
}
it("stores a scheduled YouTube link once, requires the administrator role and uses Chilean time", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-24T13:00:00Z"));
  try {
    const input = { title: "Episodio de prueba", url: "https://youtu.be/demo-video1?si=abc", date: "2026-11-25", time: "19:00", format: "chapter" };
    expect((await call("admin/episode-schedule", input, "production")).status).toBe(403);
    expect((await call("admin/episode-schedule", { ...input, url: "https://youtube.example.test/watch?v=demo-video1" }, true)).status).toBe(400);
    expect((await call("admin/episode-schedule", { ...input, date: "2026-02-30" }, true)).status).toBe(400);
    expect((await call("admin/episode-schedule", { ...input, date: "2026-11-23" }, true)).status).toBe(400);
    const shortLink = "https://www.youtube.com/shorts/demo-video2";
    expect((await call("admin/episode-schedule", { ...input, url: shortLink }, true)).status).toBe(400);
    const short = await call("admin/episode-schedule", { ...input, url: shortLink, format: "short" }, true);
    expect(short.status).toBe(201);
    expect(await short.json()).toMatchObject({ youtubeId: "demo-video2", format: "short" });
    const response = await call("admin/episode-schedule", input, true);
    expect(response.status).toBe(201);
    const scheduled = await response.json();
    expect(scheduled).toEqual({ youtubeId: "demo-video1", publishAt: "2026-11-25T22:00:00.000Z", title: input.title, format: "chapter", removedAt: null });
    expect((await call("admin/episode-schedule", { ...input, url: "https://www.youtube.com/watch?v=demo-video1" }, true)).status).toBe(409);
    expect((await call("admin/episode-schedule/demo-video1", { format: "short" }, "production")).status).toBe(403);
    const updated = { ...scheduled, format: "short" };
    expect(await (await call("admin/episode-schedule/demo-video1", { format: "short" }, true)).json()).toEqual({ video: updated });
    const collision = { ...input, action: "edit", url: shortLink, format: "short" };
    expect((await call("admin/episode-schedule/demo-video1", collision, true)).status).toBe(409);
    const afterCollision = await (await call("admin/overview", undefined, true)).json();
    expect(afterCollision.scheduledEpisodes).toEqual(expect.arrayContaining([expect.objectContaining({ youtubeId: "demo-video1", removedAt: null })]));
    const newLink = "https://youtu.be/demo-video3";
    const edit = { ...input, action: "edit", url: newLink, title: "Título corregido", date: "2026-11-26", time: "20:00" };
    const change = await (await call("admin/episode-schedule/demo-video1", edit, true)).json();
    expect(change.video).toMatchObject({ youtubeId: "demo-video3", title: edit.title, publishAt: "2026-11-26T23:00:00.000Z", removedAt: null });
    expect(change.replaced).toMatchObject({ youtubeId: "demo-video1", removedAt: expect.any(String) });
    const withdrawal = await call("admin/episode-schedule/demo-video3", { action: "remove" }, true);
    expect(await withdrawal.json()).toMatchObject({ video: { youtubeId: "demo-video3", removedAt: expect.any(String) } });
    const overview = await (await call("admin/overview", undefined, true)).json();
    expect(overview.scheduledEpisodes).toEqual(expect.arrayContaining([expect.objectContaining({ youtubeId: "demo-video3", available: false })]));
    expect((await call("admin/overview")).status).toBe(401);
  } finally {
    vi.useRealTimers();
  }
});

it("edits pending invitations via the panel endpoint and suppresses duplicate sends", async () => {
  const doc = await (await call("admin/document", { title:"Documento", version:"edit-1", content:"Documento ficticio para verificar la edición de invitaciones pendientes.", privacy:"Aviso de privacidad ficticio para verificar la edición de invitaciones.", acceptance:"Acepto las condiciones de este documento de prueba." }, true)).json();
  await call("admin/approve", { id: doc.id, approved: true }, true);
  const input = { name: "Invitada ficticia", email: "guest@example.test", episode: "Grabación", recordingAt: new Date(Date.now()+86400000).toISOString(), documentId: doc.id };
  const first = await call("admin/invite", input, true);
  const { id } = await first.json();
  expect(first.status).toBe(201);
  const duplicate = await call("admin/invite", input, true);
  expect(duplicate.status).toBe(200);
  expect(await duplicate.json()).toEqual({ id, alreadyExists: true });
  const updated = { ...input, email: "corrected@example.test" };
  expect((await call(`admin/invite/${id}`, updated, "production")).status).toBe(403);
  expect(await (await call(`admin/invite/${id}`, updated, true)).json()).toEqual({ id, updated: true });
  expect(await (await call("admin/overview", undefined, true)).json()).toMatchObject({ authorizations: [{ id, email: updated.email }] });
});
async function prepare(legacy = false) {
  const legal={title:"Documento de prueba",version:"route-1",content:"Documento exclusivamente ficticio para pruebas de autorización y confirmación.",privacy:"Los datos ficticios de esta prueba no se utilizan ni conservan en producción.",acceptance:"He leído y acepto expresamente el documento ficticio de prueba."};
  const document=await (await call("admin/document",legal,true)).json();
  expect((await call("admin/approve",{id:document.id,approved:true},true)).status).toBe(200);
  const response=await call("admin/invite",{name:"Prueba de integración",email:"guest@example.test",episode:"Entrevista ficticia",recordingAt:new Date(Date.now()+86400000).toISOString(),documentId:document.id},true);
  expect(response.status).toBe(201);const {id}=await response.json();
  expect((await call("guest/exchange",{token:await mailToken("invitation")})).status).toBe(200);
  const view=await (await call("guest/me")).json();
  if (legacy) {
    const { rows: [row] } = await pg.query<{personal:string}>("SELECT personal FROM sa_authorizations WHERE id=$1", [id]);
    const person = JSON.parse(unseal(row.personal, `personal:${id}`));
    const personal = seal(JSON.stringify({ ...person, rut: "12345678-5" }), `personal:${id}`);
    await pg.query("UPDATE sa_authorizations SET state='pending', accepted_at=now(), personal=$2 WHERE id=$1", [id, personal]);
    expect((await call("guest/resend", {})).status).toBe(200);
  } else {
    expect((await call("guest/accept",{name:"Invitado ficticio",rut:"12345678-5",accepted:true,documentDigest:view.document.digest})).status).toBe(200);
  }
  return id as string;
}
it("confirms on acceptance with a PDF and no verification email", async () => {
  const id = await prepare();
  expect(await (await call("guest/me")).json()).toMatchObject({ state: "confirmed", confirmationMethod: null });
  const receipt = await call("guest/receipt");
  expect(receipt.status).toBe(200);
  expect(Buffer.from(await receipt.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
  const jobs = await pg.query<{kind:string}>("SELECT kind FROM sa_outbox WHERE authorization_id=$1 ORDER BY kind", [id]);
  expect(jobs.rows.map(job => job.kind)).toEqual(["guest_receipt", "invitation", "production"]);
  const audit = await pg.query("SELECT actor FROM sa_events WHERE authorization_id=$1 AND kind='invitation_confirmed'", [id]);
  expect(audit.rows).toEqual([{ actor: "guest" }]);
  await pg.exec(await readFile("migrations/003_production_confirmation.sql", "utf8"));
  expect((await (await call("guest/me")).json()).confirmationMethod).toBeNull();
});
it.each(["email","production"])("completes invitation → acceptance → %s confirmation → PDF through real route handlers",async method=>{
  const id=await prepare(true);
  expect((await (await call("guest/me")).json()).state).toBe("pending");
  expect((await call("guest/receipt")).status).toBe(409);
  const verification=await mailToken("verification");
  expect((await call("guest/verification",{token:verification})).status).toBe(200);
  expect(state.jar.has("sa_confirmation")).toBe(true);
  expect((await call("guest/confirmation")).status).toBe(200);
  expect((await (await call("guest/me")).json()).state).toBe("pending");
  expect((await call(method==="email"?"guest/confirm":"admin/confirm",method==="email"?{}:{id,approved:true},method==="production")).status).toBe(200);
  expect((await (await call("guest/me")).json())).toMatchObject({state:"confirmed",confirmationMethod:method});
  const receipt=await call("guest/receipt");expect(receipt.status).toBe(200);expect(receipt.headers.get("content-type")).toBe("application/pdf");
  expect(Buffer.from(await receipt.arrayBuffer()).subarray(0,5).toString()).toBe("%PDF-");
  const row=(await pg.query<{confirmation_method:string;confirmed_by:string|null}>("SELECT confirmation_method,confirmed_by FROM sa_authorizations WHERE id=$1",[id])).rows[0];
  expect(row).toEqual({confirmation_method:method,confirmed_by:method==="production"?"admin@example.test":null});
  expect((await call("guest/confirmation")).status).not.toBe(200);
  expect(state.after).toHaveBeenCalled();
});
it("rejects through the admin route and blocks unauthorized decisions and guest evidence",async()=>{
  const id=await prepare(true);
  expect((await call("admin/confirm",{id,approved:true})).status).toBe(401);
  expect((await call("admin/reject",{id,rejected:true})).status).toBe(401);
  expect((await call("admin/reject",{id,rejected:true},true)).status).toBe(200);
  expect((await call("guest/me")).status).not.toBe(200);
  expect((await call("admin/receipt/"+id,undefined,true)).status).toBe(409);
  expect((await pg.query<{state:string}>("SELECT state FROM sa_authorizations WHERE id=$1",[id])).rows[0].state).toBe("rejected");
});

it("publishes and removes real review records through authenticated routes", async () => {
  const input = {
    action: "add",
    author: "Persona de prueba",
    platform: "YouTube",
    comment: "Comentario ficticio para la prueba de integración.",
    sourceUrl: "https://youtu.be/example",
  };
  expect((await call("admin/reviews", input)).status).toBe(401);
  expect((await call("admin/reviews", input, "production")).status).toBe(403);
  expect((await call("public/reviews", input, true)).status).toBe(404);
  expect((await call("admin/reviews", { ...input, sourceUrl: "https://youtube.com.example.test/watch" }, true)).status).toBe(400);
  expect((await call("admin/reviews", { ...input, platform: "Otra" }, true)).status).toBe(400);
  expect(await (await call("public/reviews")).json()).toEqual([]);

  const created = await call("admin/reviews", input, true);
  expect(created.status).toBe(201);
  const review = await created.json();
  expect(review).toEqual({
    id: expect.any(String),
    author: input.author,
    platform: input.platform,
    comment: input.comment,
    sourceUrl: input.sourceUrl,
  });
  const published = await call("public/reviews");
  expect(published.headers.get("cache-control")).toContain("no-store");
  expect(await published.json()).toEqual([review]);
  expect(await (await call("admin/reviews", undefined, true)).json()).toEqual([review]);

  const removal = { action: "delete", id: review.id };
  expect((await call("admin/reviews", removal, "production")).status).toBe(403);
  expect((await call("admin/reviews", removal, true)).status).toBe(200);
  expect(await (await call("public/reviews")).json()).toEqual([]);
});
