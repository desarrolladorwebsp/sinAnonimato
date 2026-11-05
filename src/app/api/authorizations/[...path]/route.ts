import { after } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AuthorizationError, readiness } from "@/lib/authorizations/config";
import { database } from "@/lib/authorizations/db";
import { digest } from "@/lib/authorizations/crypto";
import { body, guestSession, json, privateHeaders, rateLimit, sameOrigin, setGuest } from "@/lib/authorizations/http";
import { processOutbox } from "@/lib/authorizations/mail";
import { Authorizations } from "@/lib/authorizations/service";

export const runtime = "nodejs";
const notify = () => after(async () => { try { await processOutbox(database()); } catch { console.error("Authorization outbox unavailable"); } });
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  try {
    const path = (await context.params).path;
    const db = database(); const service = new Authorizations(db);
    const method = request.method;
    if (method === "POST") sameOrigin(request);
    if (path[0] === "guest") {
      const session = await guestSession();
      // Shared persistent quota for unknown sessions prevents distributed token guessing;
      // valid sessions have their own quota. Never trust arbitrary forwarded IP headers.
      await rateLimit(db, "guest:global", 300);
      await rateLimit(db, session ? `guest:${digest(session)}` : "guest:anonymous", 60);
      if (method === "GET" && path[1] === "me") return json(await service.view(session));
      if (method === "GET" && path[1] === "receipt") {
        const row = await service.guestRow(session);
        return new Response(new Uint8Array(await service.receipt(row, "guest")), { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="autorizacion-${row.id}.pdf"` } });
      }
      if (method === "POST") {
        const input = await body(request);
        if (path[1] === "exchange") { const result = await service.exchange(input.token); await setGuest(result.session, result.expires); return json({ ok: true }); }
        if (path[1] === "accept") { await service.accept(session, input); notify(); return json({ ok: true }); }
        if (path[1] === "resend") { await service.resend(session); notify(); return json({ ok: true }); }
        if (path[1] === "confirm") { const result = await service.confirm(input.token); await setGuest(result.session, result.expires); notify(); return json({ ok: true }); }
      }
    }
    if (path[0] === "admin") {
      const admin = await requireAdmin(request.headers);
      await rateLimit(db, `admin:${admin.email}`, 90);
      if (method === "GET" && path[1] === "overview") {
        const [documents, authorizations, jobs] = await Promise.all([
          db.query("SELECT * FROM sa_documents ORDER BY created_at DESC"),
          service.list(new URL(request.url).searchParams.get("q") || ""),
          db.query("SELECT authorization_id,kind,status,delivery,attempts FROM sa_outbox ORDER BY created_at DESC LIMIT 1000"),
        ]);
        return json({ admin, documents: documents.rows, authorizations, jobs: jobs.rows, readiness: readiness() });
      }
      if (method === "GET" && path[1] === "detail" && path[2]) {
        const row = await service.adminRow(path[2]);
        const [events, document] = await Promise.all([db.query("SELECT kind,actor,happened_at,details FROM sa_events WHERE authorization_id=$1 ORDER BY happened_at", [row.id]), db.query("SELECT * FROM sa_documents WHERE id=$1", [row.document_id])]);
        return json({ events: events.rows, document: document.rows[0], receiptDigest: row.receipt_digest });
      }
      if (method === "GET" && path[1] === "receipt" && path[2]) {
        const row = await service.adminRow(path[2]);
        return new Response(new Uint8Array(await service.receipt(row, admin.email)), { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="autorizacion-${row.id}.pdf"` } });
      }
      if (method === "POST") {
        const input = await body(request);
        if (path[1] === "invite") { const result = await service.invite(input, admin.email); notify(); return json(result, 201); }
        if (path[1] === "manage" && input.action === "resend") { await service.manage(String(input.id), input.action, admin.email); notify(); return json({ ok: true }); }
        await requireAdmin(request.headers, true);
        if (path[1] === "document") return json(await service.createDocument(input, admin.email), 201);
        if (path[1] === "approve") { await service.approveDocument(String(input.id), admin.email, input.approved); return json({ ok: true }); }
        if (path[1] === "retire") { await service.retireDocument(String(input.id)); return json({ ok: true }); }
        if (path[1] === "manage") { await service.manage(String(input.id), input.action, admin.email, input.reason); return json({ ok: true }); }
      }
    }
    return json({ error: "Ruta no disponible." }, 404);
  } catch (error) {
    if (error instanceof AuthorizationError) return json({ error: error.message }, error.status);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return json({ error: "Ya existe un registro con esa versión o identificador." }, 409);
    console.error("Authorization request failed");
    return json({ error: "No se pudo completar la solicitud. Inténtalo nuevamente o contacta a producción." }, 500);
  }
}
export const GET = handler;
export const POST = handler;
