import { Resend } from "resend";
import { randomUUID } from "node:crypto";
import { resolveFromAddress } from "@/lib/send-contact";
import { AuthorizationError } from "./config";
import type { Database } from "./db";
import { unseal } from "./crypto";
import { event } from "./service";

type Payload = { to: string; name: string; episode: string; url?: string };
type Job = { id: string; authorization_id: string; kind: string; payload: string; attempts: number };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function sendAdminCode(to: string, code: string) {
  if (!process.env.RESEND_API_KEY) throw new AuthorizationError(503, "Falta configurar el envío de correos.");
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: resolveFromAddress(), to, subject: "Tu código de acceso · Sin Anonimato", text: `Tu código de acceso al panel es ${code}. Vence en 5 minutos. Si no lo solicitaste, ignora este mensaje.` });
  if (error) throw new Error("Admin code delivery failed");
}

export type MailSender = (job: Job, payload: Payload, attachment?: Buffer) => Promise<string>;
export const resendSender: MailSender = async (job, payload, attachment) => {
  if (!process.env.RESEND_API_KEY) throw new Error("Mail transport not configured");
  const subjects: Record<string, string> = { invitation: "Tu invitación al podcast", verification: "Confirma tu autorización", guest_receipt: "Tu comprobante de autorización", production: "Autorización completada" };
  const copy: Record<string, string> = {
    invitation: "Antes de grabar, revisa y confirma tu autorización de participación. Este enlace es privado y tiene vencimiento.",
    verification: "Recibimos tu aceptación. Abre el enlace y presiona Confirmar mi autorización. El enlace vence en 30 minutos como máximo.",
    guest_receipt: "Tu autorización quedó confirmada. Adjuntamos tu comprobante para que conserves una copia.",
    production: "El invitado completó la confirmación por correo y su comprobante PDF ya está disponible en el panel privado.",
  };
  const button = job.kind === "invitation" ? "Revisar autorización" : job.kind === "verification" ? "Confirmar autorización" : "Abrir panel privado";
  const text = `Hola, ${payload.name}.\n\n${copy[job.kind]}\nParticipación: ${payload.episode}\n${payload.url || ""}\n\nSin Anonimato`;
  const html = `<html lang="es"><body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif"><div style="max-width:560px;margin:32px auto;background:#fff"><div style="background:#080808;padding:28px;color:#fff;font-size:23px;font-weight:bold">SIN <span style="color:#ff2a2a">ANONIMATO</span></div><div style="padding:28px"><h1 style="font-size:24px">${subjects[job.kind]}</h1><p>Hola, ${escape(payload.name)}.</p><p style="line-height:1.7">${copy[job.kind]}</p><p>Participación: ${escape(payload.episode)}</p>${payload.url ? `<p style="margin:32px 0"><a href="${escape(payload.url)}" style="background:#e51b23;color:#fff;padding:15px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${button}</a></p><p style="font-size:12px;word-break:break-all">${escape(payload.url)}</p>` : ""}<p style="font-size:12px;color:#555">Este correo corresponde exclusivamente al proceso de autorización de tu participación.</p></div></div></body></html>`;
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: resolveFromAddress(), to: payload.to, subject: `${subjects[job.kind]} · Sin Anonimato`, html, text, attachments: attachment ? [{ filename: `autorizacion-${job.authorization_id}.pdf`, content: attachment }] : undefined, tags: [{ name: "category", value: `authorization-${job.kind}` }] }, { idempotencyKey: `authorization/${job.id}` });
  if (result.error || !result.data) throw new Error("Mail delivery failed");
  return result.data.id;
};

export async function processOutbox(db: Database, send: MailSender = resendSender, limit = 15) {
  // A scheduler retries crash-interrupted work. Provider keys remain identical on every retry.
  await db.query("UPDATE sa_outbox SET status='queued' WHERE status='sending' AND locked_at < now() - interval '10 minutes'");
  await db.query("UPDATE sa_outbox SET status='cancelled',payload='' WHERE status IN ('queued','failed') AND created_at < now() - interval '23 hours'");
  await db.query("UPDATE sa_outbox SET status='cancelled',payload='' WHERE status IN ('queued','failed') AND expires_at <= now()");
  let processed = 0;
  for (let index = 0; index < limit; index++) {
    const job = await db.transaction(async connection => {
      const { rows } = await connection.query<Job>("SELECT * FROM sa_outbox WHERE status IN ('queued','failed') AND attempts < 8 AND available_at <= now() AND (expires_at IS NULL OR expires_at > now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
      if (!rows[0]) return null;
      await connection.query("UPDATE sa_outbox SET status='sending',locked_at=now(),attempts=attempts+1 WHERE id=$1", [rows[0].id]);
      return rows[0];
    });
    if (!job) break;
    try {
      const payload: Payload = JSON.parse(unseal(job.payload, `mail:${job.id}`));
      let attachment: Buffer | undefined;
      if (job.kind === "guest_receipt") {
        const { rows } = await db.query<{ receipt: string }>("SELECT receipt FROM sa_authorizations WHERE id=$1 AND state='confirmed'", [job.authorization_id]);
        if (!rows[0]?.receipt) throw new Error("Receipt missing");
        attachment = Buffer.from(unseal(rows[0].receipt, `receipt:${job.authorization_id}`), "base64");
      }
      const providerId = await send(job, payload, attachment);
      await db.transaction(async connection => {
        await connection.query("UPDATE sa_outbox SET status='sent',provider_id=$2,payload='',locked_at=NULL WHERE id=$1", [job.id, providerId]);
        await event(connection, job.authorization_id, "mail_sent", "system", { kind: job.kind, providerId });
      });
      processed++;
    } catch {
      await db.query("UPDATE sa_outbox SET status='failed',locked_at=NULL,available_at=now() + ($2 * interval '1 minute') WHERE id=$1", [job.id, Math.min(60, 2 ** job.attempts)]);
      // Do not log email addresses, links, tokens, or provider errors.
      console.error("Authorization mail job failed", job.id);
    }
  }
  return { processed, runId: randomUUID() };
}
