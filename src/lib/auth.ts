import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { pool } from "./authorizations/db";
import { adminRole, AuthorizationError, appOrigin } from "./authorizations/config";
import { sendAdminCode } from "./authorizations/mail";

let instance: ReturnType<typeof buildAuth> | undefined;
function buildAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new AuthorizationError(503, "Falta configurar el acceso seguro del panel.");
  return betterAuth({
    appName: "Sin Anonimato",
    baseURL: appOrigin(),
    secret,
    database: pool(),
    trustedOrigins: [appOrigin()],
    emailAndPassword: { enabled: false },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 15 },
    hooks: { before: createAuthMiddleware(async ctx => {
      const allowed = new Set(["/email-otp/send-verification-otp", "/sign-in/email-otp", "/get-session", "/sign-out"]);
      if (!allowed.has(ctx.path)) throw new APIError("FORBIDDEN", { message: "Operación no disponible." });
      if (ctx.body?.email && !adminRole(String(ctx.body.email))) throw new APIError("FORBIDDEN", { message: "Acceso disponible solo para el equipo autorizado." });
      if (ctx.path === "/email-otp/send-verification-otp" && ctx.body?.type !== "sign-in") throw new APIError("FORBIDDEN");
    }) },
    databaseHooks: { user: { create: { before: async user => {
      if (!adminRole(user.email)) throw new APIError("FORBIDDEN");
      return { data: user };
    } } } },
    plugins: [emailOTP({ otpLength: 6, expiresIn: 300, allowedAttempts: 3, storeOTP: "hashed", sendVerificationOTP: async ({ email, otp, type }) => {
      if (type !== "sign-in" || !adminRole(email)) throw new APIError("FORBIDDEN");
      await sendAdminCode(email, otp);
    } }), nextCookies()],
  });
}
export function getAuth() { return instance ??= buildAuth(); }

export async function requireAdmin(headers: Headers, write = false) {
  const session = await getAuth().api.getSession({ headers });
  const role = session ? adminRole(session.user.email) : null;
  if (!session || !role || !session.user.emailVerified) throw new AuthorizationError(401, "Inicia sesión con un correo del equipo autorizado.");
  if (write && role !== "admin") throw new AuthorizationError(403, "Solo administración puede realizar esta operación.");
  return { email: session.user.email, role };
}
