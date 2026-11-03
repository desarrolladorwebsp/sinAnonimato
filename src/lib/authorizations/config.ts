export class AuthorizationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function appOrigin() {
  const origin = process.env.APP_URL || process.env.BETTER_AUTH_URL;
  if (!origin) throw new AuthorizationError(503, "El módulo de autorizaciones aún no está configurado.");
  const url = new URL(origin);
  if ((process.env.NODE_ENV === "production" && url.protocol !== "https:") || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new AuthorizationError(503, "La dirección del módulo no está configurada correctamente.");
  }
  return url.origin;
}

export function retentionSettings() {
  const retention = Number(process.env.AUTHORIZATION_RETENTION_DAYS);
  if (!Number.isInteger(retention) || retention < 1 || retention > 36500 || !process.env.AUTHORIZATION_RETENTION_POLICY?.trim()) {
    throw new AuthorizationError(503, "Falta definir la política de conservación de autorizaciones.");
  }
  return { retention, retentionPolicy: process.env.AUTHORIZATION_RETENTION_POLICY!.trim() };
}

export function settings() {
  return { origin: appOrigin(), ...retentionSettings() };
}

export function readiness() {
  let retentionConfigured = false;
  try { retentionSettings(); retentionConfigured = true; } catch { /* Invitations remain blocked. */ }
  return { retentionConfigured, mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.PRODUCTION_EMAIL) };
}

export function adminRole(email: string): "admin" | "production" | null {
  const includes = (key: string) => (process.env[key] || "").split(",").some(value => value.trim().toLowerCase() === email.toLowerCase());
  return includes("AUTHORIZATION_ADMIN_EMAILS") ? "admin" : includes("AUTHORIZATION_PRODUCTION_EMAILS") ? "production" : null;
}
