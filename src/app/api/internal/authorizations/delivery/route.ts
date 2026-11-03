import { Resend } from "resend";
import { database } from "@/lib/authorizations/db";
import { json } from "@/lib/authorizations/http";
import { event } from "@/lib/authorizations/service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RESEND_AUTHORIZATION_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Webhook no configurado." }, 503);
  if (Number(request.headers.get("content-length")) > 100000) return json({ error: "Solicitud demasiado grande." }, 413);
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  if (!reader) return json({ error: "Solicitud inválida." }, 400);
  while (true) { const result = await reader.read(); if (result.done) break; size += result.value.byteLength; if (size > 100000) { await reader.cancel(); return json({ error: "Solicitud demasiado grande." }, 413); } chunks.push(result.value); }
  let payload;
  try { payload = new Resend(process.env.RESEND_API_KEY || "webhook-verification-only").webhooks.verify({ payload: Buffer.concat(chunks).toString("utf8"), webhookSecret: secret, headers: { id: request.headers.get("svix-id") || "", timestamp: request.headers.get("svix-timestamp") || "", signature: request.headers.get("svix-signature") || "" } }); }
  catch { return json({ error: "Firma inválida." }, 401); }
  const types = ["email.sent", "email.delivered", "email.delivery_delayed", "email.bounced", "email.failed", "email.complained", "email.suppressed"];
  if (!types.includes(payload.type) || !("email_id" in payload.data) || !("tags" in payload.data) || !payload.data.tags?.category?.startsWith("authorization-")) return json({ ok: true });
  const providerId = payload.data.email_id;
  try {
    return await database().transaction(async db => {
      const { rows } = await db.query<{ id: string; authorization_id: string }>("SELECT id,authorization_id FROM sa_outbox WHERE provider_id=$1 FOR UPDATE", [providerId]);
      // Resend may deliver the event before the send response is persisted: request a retry.
      if (!rows[0]) return json({ error: "Envío aún no registrado." }, 503);
      const id = request.headers.get("svix-id")!;
      const inserted = await db.query("INSERT INTO sa_delivery_events(id,job_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id", [id, rows[0].id]);
      if (inserted.rows.length) {
        await db.query("UPDATE sa_outbox SET delivery=$2,delivery_at=$3 WHERE id=$1 AND (delivery_at IS NULL OR delivery_at <= $3)", [rows[0].id,payload.type,new Date(payload.created_at)]);
        await event(db, rows[0].authorization_id, "mail_delivery", "resend", { providerId, status: payload.type });
      }
      return json({ ok: true });
    });
  } catch { return json({ error: "No se pudo registrar el evento." }, 503); }
}
