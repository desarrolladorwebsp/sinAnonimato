// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { getMigrations } from "better-auth/db/migration";

const state = vi.hoisted(() => ({ pg: null as unknown as PGlite }));
vi.mock("pg", () => ({ Pool: class {
  async connect() { return { query: this.query.bind(this), release() {}, on() {}, off() {} }; }
  async query(sql: string | { text: string; values?: unknown[] }, params?: unknown[]) {
    const text = typeof sql === "string" ? sql : sql.text;
    const result = await state.pg.query(text, typeof sql === "string" ? params : sql.values);
    return { rows: result.rows, rowCount: result.affectedRows, command: text.trim().split(" ")[0].toUpperCase() };
  }
  async end() {}
} }));
import { getAuth, requireAdmin } from "@/lib/auth";
import { POST as authorizationRoute } from "@/app/api/authorizations/[...path]/route";
import { POST as authRoute } from "@/app/api/auth/[...all]/route";

beforeAll(async () => {
  state.pg = new PGlite();
  vi.stubEnv("DATABASE_URL", "postgres://isolated-test"); vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", "isolated-test-secret-with-at-least-32-characters");
  vi.stubEnv("AUTHORIZATION_RETENTION_DAYS", "365"); vi.stubEnv("AUTHORIZATION_RETENTION_POLICY", "Política de prueba.");
  vi.stubEnv("AUTHORIZATION_ADMIN_EMAILS", "admin@example.test"); vi.stubEnv("AUTHORIZATION_PRODUCTION_EMAILS", "production@example.test");
  await (await getMigrations(getAuth().options)).runMigrations();
  await state.pg.exec("CREATE TABLE sa_rate_limits(key text PRIMARY KEY,hits integer NOT NULL,reset_at timestamptz NOT NULL)");
}, 30000);
afterAll(async () => { await state.pg.close(); vi.unstubAllEnvs(); });
let requestNumber = 10;
const authRequest = (path: string, body: unknown) => authRoute(new Request(`http://localhost:3000/api/auth${path}`, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${requestNumber++}` }, body: JSON.stringify(body) }));

const password = "isolated-fixture-password-2026";
async function provision(email: string, verified = true) {
  const context = await getAuth().$context;
  const user = await context.internalAdapter.createUser({ email, name: "Test team", emailVerified: verified }, { method: "email-password" });
  const hash = await context.password.hash(password);
  await context.internalAdapter.linkAccount({ userId: user.id, accountId: user.id, providerId: "credential", password: hash });
  return hash;
}

describe("password authentication with real handlers and isolated PostgreSQL", () => {
  it("rejects registration even for allowed accounts and removes code login", async () => {
    expect((await authRequest("/sign-up/email", { email: "admin@example.test", password, name: "Admin" })).status).not.toBe(200);
    expect((await authRequest("/email-otp/send-verification-otp", { email: "admin@example.test", type: "sign-in" })).status).not.toBe(200);
    expect((await authRequest("/sign-in/email-otp", { email: "admin@example.test", otp: "123456" })).status).not.toBe(200);
  });
  it("rejects another email even if its password is correct", async () => {
    await provision("admin@example.test");
    const hash = await provision("production@example.test");
    expect(hash).not.toContain(password);
    expect((await authRequest("/sign-in/email", { email: "outsider@example.test", password })).status).toBe(403);
  });
  it("rejects a wrong password without issuing a session", async () => {
    const response = await authRequest("/sign-in/email", { email: "admin@example.test", password: "wrong-fixture-password" });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("accepts the password, enforces roles, and rejects removed accounts", async () => {
    const response = await authRequest("/sign-in/email", { email: "production@example.test", password, rememberMe: false });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    const cookie = response.headers.get("set-cookie")!.split(";")[0]; const headers = new Headers({ cookie });
    expect(await requireAdmin(headers)).toMatchObject({ role: "production", email: "production@example.test" });
    await expect(requireAdmin(headers, true)).rejects.toThrow("administración");
    for (const action of ["confirm", "reject"]) {
      const response = await authorizationRoute(new Request(`http://localhost:3000/api/authorizations/admin/${action}`, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", cookie }, body: JSON.stringify({ id: "fixture", approved: true, rejected: true }) }), { params: Promise.resolve({ path: ["admin", action] }) });
      expect(response.status).toBe(403);
    }

    vi.stubEnv("AUTHORIZATION_PRODUCTION_EMAILS", ""); await expect(requireAdmin(headers)).rejects.toThrow("Inicia sesión");
    vi.stubEnv("AUTHORIZATION_PRODUCTION_EMAILS", "production@example.test");
  });
  it("rejects unverified accounts", async () => {
    vi.stubEnv("AUTHORIZATION_ADMIN_EMAILS", "admin@example.test,unverified@example.test");
    await provision("unverified@example.test", false);
    expect((await authRequest("/sign-in/email", { email: "unverified@example.test", password })).status).toBe(403);
    vi.stubEnv("AUTHORIZATION_ADMIN_EMAILS", "admin@example.test");
  });
  it("rejects unauthenticated requests and foreign origins", async () => {
    await expect(requireAdmin(new Headers())).rejects.toThrow();
    const response = await authRoute(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.test", password }) }));
    expect(response.status).toBe(403);
  });
  it("bounds login payloads before parsing passwords", async () => {
    expect((await authRequest("/sign-in/email", { email: "admin@example.test", password: "x".repeat(9000) })).status).toBe(413);
  });
  it("limits password attempts across changing source addresses", async () => {
    await state.pg.exec("DELETE FROM sa_rate_limits");
    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await authRoute(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${attempt + 1}` }, body: JSON.stringify({ email: "admin@example.test", password: "wrong-fixture-password" }) }));
      expect(response.status).toBe(attempt < 5 ? 401 : 429);
    }
  });
});
