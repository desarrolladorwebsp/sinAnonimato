// @vitest-environment node
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { Connection, Database } from "@/lib/authorizations/db";
import { unseal } from "@/lib/authorizations/crypto";
const state = vi.hoisted(() => ({ db: null as unknown as Database, jar: new Map<string,string>(), after: vi.fn() }));
vi.mock("@/lib/authorizations/db", () => ({ database: () => state.db }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (key:string) => state.jar.has(key) ? { value: state.jar.get(key) } : undefined, set: (key:string,value:string) => { if(value) state.jar.set(key,value); else state.jar.delete(key); } }) }));
vi.mock("next/server", () => ({ after: state.after }));
vi.mock("@/lib/auth", () => ({ requireAdmin: async (headers:Headers) => {
  if(headers.get("x-fixture-admin") !== "yes") { const { AuthorizationError } = await import("@/lib/authorizations/config"); throw new AuthorizationError(401,"Acceso requerido"); }
  return { email: "admin@example.test", role: "admin" };
} }));
import { POST, GET } from "@/app/api/authorizations/[...path]/route";
const pg = new PGlite();
function connection(target: Pick<PGlite,"query">):Connection { return { async query<T extends Record<string,unknown>>(sql:string, values?:unknown[]) { const r=await target.query<T>(sql,values); return {rows:r.rows,rowCount:r.affectedRows}; } }; }
beforeAll(async () => {
  vi.stubEnv("APP_URL","http://localhost:3000"); vi.stubEnv("AUTHORIZATION_ENCRYPTION_KEY","a".repeat(64)); vi.stubEnv("AUTHORIZATION_RETENTION_DAYS","365"); vi.stubEnv("AUTHORIZATION_RETENTION_POLICY","Conservación ficticia de prueba"); vi.stubEnv("PRODUCTION_EMAIL","production@example.test");
  state.db={...connection(pg),transaction:work=>pg.transaction(tx=>work(connection(tx)))};
  for(const name of ["001_authorizations.sql","002_indefinite_retention.sql","003_production_confirmation.sql"]) await pg.exec(await readFile(`migrations/${name}`,"utf8"));
});
beforeEach(async()=>{ state.jar.clear();state.after.mockClear();await pg.exec("TRUNCATE sa_events,sa_outbox,sa_authorizations,sa_documents,sa_rate_limits CASCADE"); });
afterAll(async()=>{ await pg.close();vi.unstubAllEnvs(); });
async function call(path:string,input?:object,admin=false) {
  const request=new Request(`http://localhost:3000/api/authorizations/${path}`,{method:input ? "POST":"GET",headers:{Origin:"http://localhost:3000","Content-Type":"application/json",...(admin ? {"x-fixture-admin":"yes"}: {})},body:input ? JSON.stringify(input):undefined});
  return (input?POST:GET)(request,{params:Promise.resolve({path:path.split("/")})});
}
async function mailToken(kind:string) {
 const r=await pg.query<{id:string;payload:string}>("SELECT id,payload FROM sa_outbox WHERE kind=$1 ORDER BY created_at DESC LIMIT 1",[kind]);
 return new URL(JSON.parse(unseal(r.rows[0].payload,`mail:${r.rows[0].id}`)).url).hash.slice(1);
}
async function prepare() {
  const legal={title:"Documento de prueba",version:"route-1",content:"Documento exclusivamente ficticio para pruebas de autorización y confirmación.",privacy:"Los datos ficticios de esta prueba no se utilizan ni conservan en producción.",acceptance:"He leído y acepto expresamente el documento ficticio de prueba."};
  const document=await (await call("admin/document",legal,true)).json();
  expect((await call("admin/approve",{id:document.id,approved:true},true)).status).toBe(200);
  const response=await call("admin/invite",{name:"Prueba de integración",email:"guest@example.test",episode:"Entrevista ficticia",recordingAt:new Date(Date.now()+86400000).toISOString(),documentId:document.id},true);
  expect(response.status).toBe(201);const {id}=await response.json();
  expect((await call("guest/exchange",{token:await mailToken("invitation")})).status).toBe(200);
  const view=await (await call("guest/me")).json();
  expect((await call("guest/accept",{name:"Invitado ficticio",rut:"12345678-5",accepted:true,documentDigest:view.document.digest})).status).toBe(200);
  return id as string;
}
it.each(["email","production"])("completes invitation → acceptance → %s confirmation → PDF through real route handlers",async method=>{
  const id=await prepare();
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
  const id=await prepare();
  expect((await call("admin/confirm",{id,approved:true})).status).toBe(401);
  expect((await call("admin/reject",{id,rejected:true})).status).toBe(401);
  expect((await call("admin/reject",{id,rejected:true},true)).status).toBe(200);
  expect((await call("guest/me")).status).not.toBe(200);
  expect((await call("admin/receipt/"+id,undefined,true)).status).toBe(409);
  expect((await pg.query<{state:string}>("SELECT state FROM sa_authorizations WHERE id=$1",[id])).rows[0].state).toBe("rejected");
});
