// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database, Connection } from "@/lib/authorizations/db";
import { Authorizations } from "@/lib/authorizations/service";
import { digest, seal, unseal } from "@/lib/authorizations/crypto";
import { processOutbox } from "@/lib/authorizations/mail";
import { rut } from "@/lib/authorizations/validation";
import { PDFDocument } from "pdf-lib";

const pg = new PGlite();
function connection(target: Pick<PGlite, "query">): Connection {
  return { async query<T extends Record<string, unknown>>(sql: string, values?: unknown[]) { const result = await target.query<T>(sql, values); return { rows: result.rows, rowCount: result.affectedRows }; } };
}
const db: Database = { ...connection(pg), transaction: work => pg.transaction(tx => work(connection(tx))) };
const service = new Authorizations(db);
const legal = { title: "Documento de prueba", version: "test-1", content: "DOCUMENTO EXCLUSIVO DE PRUEBA. Autorización de ejemplo para verificar el sistema local.\nEste contenido no corresponde a condiciones legales aprobadas para invitados.", privacy: "AVISO EXCLUSIVO DE PRUEBA. Los datos de este ensayo son ficticios y se eliminan al terminar la ejecución de las pruebas.", acceptance: "He leído y acepto expresamente el documento de prueba presentado." };
let documentId = "";
beforeAll(async () => {
  vi.stubEnv("AUTHORIZATION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("AUTHORIZATION_RETENTION_DAYS", "365"); vi.stubEnv("AUTHORIZATION_RETENTION_POLICY", "Política ficticia de conservación, exclusivamente para pruebas.");
  vi.stubEnv("PRODUCTION_EMAIL", "produccion@example.test");
  await pg.exec(await readFile("migrations/001_authorizations.sql", "utf8"));
});
beforeEach(async () => {
  await pg.exec("TRUNCATE sa_events,sa_outbox,sa_authorizations,sa_documents,sa_rate_limits CASCADE");
  documentId = (await service.createDocument(legal, "admin@example.test")).id;
  await service.approveDocument(documentId, "admin@example.test", true);
});
afterAll(async () => { await pg.close(); vi.unstubAllEnvs(); });
async function jobToken(kind: string) {
  const { rows } = await db.query<{ id: string; payload: string }>("SELECT id,payload FROM sa_outbox WHERE kind=$1 ORDER BY created_at DESC LIMIT 1", [kind]);
  const payload = JSON.parse(unseal(rows[0].payload, `mail:${rows[0].id}`));
  return new URL(payload.url).hash.slice(1);
}
async function invitation() {
  const result = await service.invite({ name: "Invitado de prueba", email: "invitado@example.test", episode: "Grabación de prueba", recordingAt: new Date(Date.now() + 3 * 86400000).toISOString(), documentId }, "admin@example.test");
  const invitation = await jobToken("invitation");
  const guest = await service.exchange(invitation);
  return { ...result, ...guest, invitation };
}
async function accepted() {
  const guest = await invitation();
  const view = await service.view(guest.session);
  await service.accept(guest.session, { name: "Invitado de prueba", rut: "12.345.678-5", accepted: true, documentDigest: view.document.digest, email: "attacker@example.test" });
  return { ...guest, verification: await jobToken("verification") };
}
describe("authorizations with an isolated PostgreSQL engine", () => {
  it("validates Chilean RUTs and rejects mismatched check digits", () => {
    expect(rut("12.345.678-5")).toBe("12345678-5"); expect(() => rut("12.345.678-9")).toThrow();
  });
  it("authenticates encrypted evidence and binds it to its record", () => {
    const value = seal("private", "record:a"); expect(unseal(value, "record:a")).toBe("private"); expect(() => unseal(value, "record:b")).toThrow();
  });
  it("blocks unapproved documents and rejects approvals without explicit confirmation", async () => {
    const draft = await service.createDocument({ ...legal, version: "draft" }, "admin");
    await expect(service.approveDocument(draft.id, "admin", false)).rejects.toThrow();
    await expect(service.invite({ name: "Prueba", email: "test@example.test", episode: "Test", recordingAt: new Date(Date.now()+86400000).toISOString(), documentId: draft.id }, "admin")).rejects.toThrow("aprobado");
  });
  it("consumes an invitation only once and encrypts personal data", async () => {
    const guest = await invitation(); await expect(service.exchange(guest.invitation)).rejects.toThrow();
    const stored = await service.adminRow(guest.id); expect(stored.personal).not.toContain("example.test"); expect(stored.invite_hash).toBeNull();
    const view = await service.view(guest.session);
    expect(view).toMatchObject({ state: "invited", email: "invitado@example.test" });
    expect(view.document).not.toHaveProperty("approved_by");
    expect(view.document).not.toHaveProperty("created_at");
  });
  it("requires explicit acceptance and the presented document digest, rejecting invalid RUTs", async () => {
    const guest = await invitation(); const view = await service.view(guest.session);
    for (const input of [{ accepted: false, documentDigest: view.document.digest, rut: "12345678-5" }, { accepted: true, documentDigest: "changed", rut: "12345678-5" }, { accepted: true, documentDigest: view.document.digest, rut: "12345678-9" }]) {
      await expect(service.accept(guest.session, { name: "Prueba", ...input })).rejects.toThrow();
    }
    expect((await service.view(guest.session)).state).toBe("invited");
  });
  it("keeps acceptance pending until email confirmation and uses the invited email", async () => {
    const guest = await accepted(); const view = await service.view(guest.session); expect(view.state).toBe("pending");
    await expect(service.receipt(await service.adminRow(guest.id), "guest")).rejects.toThrow();
    const { rows } = await db.query<{ id: string; payload: string }>("SELECT id,payload FROM sa_outbox WHERE kind='verification'");
    expect(JSON.parse(unseal(rows[0].payload, `mail:${rows[0].id}`)).to).toBe("invitado@example.test");
    await expect(service.resend(guest.session)).rejects.toThrow("minuto");
  });
  it("atomically confirms, produces an integrity-checked PDF and queues both notifications", async () => {
    const guest = await accepted(); const confirmed = await service.confirm(guest.verification);
    expect((await service.view(confirmed.session)).state).toBe("confirmed");
    await expect(service.confirm(guest.verification)).rejects.toThrow();
    const row = await service.adminRow(guest.id); const pdf = await service.receipt(row, "guest");
    expect(digest(pdf)).toBe(row.receipt_digest); expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(0);
    const { rows } = await db.query<{ kind: string }>("SELECT kind FROM sa_outbox WHERE kind IN ('guest_receipt','production')");
    expect(rows.map(value => value.kind).sort()).toEqual(["guest_receipt","production"]);
    await mkdir(".preview/authorizations", { recursive: true }); await writeFile(".preview/authorizations/comprobante-prueba.pdf", pdf);
  });
  it("rejects expired confirmations and invalidates sessions after cancellation", async () => {
    const guest = await accepted(); await db.query("UPDATE sa_authorizations SET verify_expires=now()-interval '1 second' WHERE id=$1", [guest.id]);
    await expect(service.confirm(guest.verification)).rejects.toThrow();
    await service.manage(guest.id, "cancel", "admin"); await expect(service.view(guest.session)).rejects.toThrow();
  });
  it("retains the original legal version when new versions are published", async () => {
    const guest = await accepted(); const next = await service.createDocument({ ...legal, version: "test-2", content: `${legal.content}\nCondición nueva de prueba.` }, "admin"); await service.approveDocument(next.id, "admin", true);
    await service.confirm(guest.verification); expect((await service.adminRow(guest.id)).document_id).toBe(documentId);
  });
  it("does not delete unexpired or legally held evidence, and cascades expired deletion", async () => {
    const guest = await invitation(); await expect(service.manage(guest.id, "delete", "admin")).rejects.toThrow();
    await service.manage(guest.id, "hold", "admin"); await db.query("UPDATE sa_authorizations SET retain_until=now()-interval '1 day' WHERE id=$1", [guest.id]);
    await expect(service.manage(guest.id, "delete", "admin")).rejects.toThrow();
    await service.manage(guest.id, "release", "admin"); await service.manage(guest.id, "delete", "admin");
    expect((await db.query("SELECT * FROM sa_events WHERE authorization_id=$1", [guest.id])).rows).toHaveLength(0);
  });
  it("sends each queued mail once and removes encrypted token payloads after delivery", async () => {
    await invitation(); const send = vi.fn().mockResolvedValue("provider-test-id");
    await processOutbox(db, send); await processOutbox(db, send); expect(send).toHaveBeenCalledTimes(1);
    expect((await db.query<{ payload: string }>("SELECT payload FROM sa_outbox" )).rows[0].payload).toBe("");
  });
  it("retries mail failures without erasing acceptance and abandons expired links", async () => {
    const guest = await accepted(); const send = vi.fn().mockRejectedValue(new Error("test failure"));
    await processOutbox(db, send); expect((await service.view(guest.session)).state).toBe("pending");
    await db.query("UPDATE sa_outbox SET expires_at=now()-interval '1 second'"); const nextSend = vi.fn(); await processOutbox(db,nextSend); expect(nextSend).not.toHaveBeenCalled();
  });
});
