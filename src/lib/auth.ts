import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { database, pool } from "./authorizations/db";
import { rateLimit } from "./authorizations/http";
import { adminRole, AuthorizationError, appOrigin } from "./authorizations/config";

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
    emailAndPassword: { enabled: true, disableSignUp: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 15 },
    hooks: { before: createAuthMiddleware(async ctx => {
      const allowed = new Set(["/sign-in/email", "/get-session", "/sign-out"]);
      if (!allowed.has(ctx.path)) throw new APIError("FORBIDDEN", { message: "Operación no disponible." });
      if (ctx.body?.email && !adminRole(String(ctx.body.email))) throw new APIError("FORBIDDEN", { message: "Acceso disponible solo para el equipo autorizado." });
      if (ctx.path === "/sign-in/email") {
        try { await rateLimit(database(), `admin-password:${String(ctx.body?.email).trim().toLowerCase()}`, 5, 300); }
        catch (error) {
          if (error instanceof AuthorizationError && error.status === 429) throw new APIError("TOO_MANY_REQUESTS", { message: "Demasiados intentos. Espera cinco minutos antes de volver a ingresar." });
          throw error;
        }
      }
    }) },
    databaseHooks: { user: { create: { before: async user => {
      if (!adminRole(user.email)) throw new APIError("FORBIDDEN");
      return { data: user };
    } } } },
    plugins: [nextCookies()],
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
