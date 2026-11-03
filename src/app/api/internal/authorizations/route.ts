import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/authorizations/db";
import { digest } from "@/lib/authorizations/crypto";
import { processOutbox } from "@/lib/authorizations/mail";
import { json } from "@/lib/authorizations/http";

export const runtime = "nodejs";
async function handler(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.AUTHORIZATION_CRON_SECRET;
  const bearer = request.headers.get("authorization");
  if (!secret || secret.length < 32 || !bearer || !timingSafeEqual(Buffer.from(digest(bearer)), Buffer.from(digest(`Bearer ${secret}`)))) return json({ error: "No autorizado." }, 401);
  try {
    const db = database();
    const result = await processOutbox(db, undefined, 50);
    // Expired records require explicit admin deletion; flagging never erases legal evidence.
    await db.query("DELETE FROM sa_rate_limits WHERE reset_at < now() - interval '1 day'");
    await db.query("UPDATE sa_outbox SET payload='',status='cancelled' WHERE status IN ('failed','queued') AND created_at < now() - interval '23 hours'");
    await db.query("UPDATE sa_authorizations SET guest_hash=NULL,verify_hash=NULL,invite_hash=NULL WHERE retain_until <= now()");
    return json(result);
  } catch { return json({ error: "No se pudo procesar la cola." }, 500); }
}
export const GET = handler;
export const POST = handler;
