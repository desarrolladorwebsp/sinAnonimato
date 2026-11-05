import { cookies } from "next/headers";
import { AuthorizationError, appOrigin } from "./config";
import { digest } from "./crypto";
import type { Database } from "./db";

export const GUEST_COOKIE = "sa_guest";
export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export const json = (value: unknown, status = 200) => Response.json(value, { status, headers: privateHeaders });
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin()) throw new AuthorizationError(403, "Solicitud de origen no permitido.");
}
export async function body(request: Request, maxBytes = 180000) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AuthorizationError(415, "Formato de solicitud inválido.");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthorizationError(400, "Solicitud vacía.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new AuthorizationError(413, "La solicitud es demasiado grande."); }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new AuthorizationError(400, "Solicitud inválida."); }
}
export async function setGuest(session: string, expires: Date) {
  (await cookies()).set(GUEST_COOKIE, session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/authorizations", expires: new Date(expires) });
}
export async function guestSession() { return (await cookies()).get(GUEST_COOKIE)?.value; }

export async function rateLimit(db: Database, identity: string, limit = 30, seconds = 60) {
  const { rows } = await db.query<{ hits: number }>("INSERT INTO sa_rate_limits(key,hits,reset_at) VALUES($1,1,now() + ($2 * interval '1 second')) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN sa_rate_limits.reset_at <= now() THEN 1 ELSE sa_rate_limits.hits+1 END,reset_at=CASE WHEN sa_rate_limits.reset_at <= now() THEN excluded.reset_at ELSE sa_rate_limits.reset_at END RETURNING hits", [digest(identity), seconds]);
  if (rows[0].hits > limit) throw new AuthorizationError(429, "Demasiados intentos. Espera un momento e inténtalo nuevamente.");
}
