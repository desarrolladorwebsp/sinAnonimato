// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { getMigrations } from "better-auth/db/migration";

const state = vi.hoisted(() => ({ pg: null as unknown as PGlite, codes: new Map<string,string>() }));
vi.mock("pg", () => ({ Pool: class {
  async connect() { return { query: this.query.bind(this), release() {}, on() {}, off() {} }; }
  async query(sql: string | { text: string; values?: unknown[] }, params?: unknown[]) {
    const text = typeof sql === "string" ? sql : sql.text;
    const result = await state.pg.query(text, typeof sql === "string" ? params : sql.values);
    return { rows: result.rows, rowCount: result.affectedRows, command: text.trim().split(" ")[0].toUpperCase() };
  }
  async end() {}
} }));
vi.mock("@/lib/authorizations/mail", () => ({ sendAdminCode: vi.fn(async (email: string, otp: string) => { state.codes.set(email, otp); }) }));
import { getAuth, requireAdmin } from "@/lib/auth";
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
const authRequest = (path: string, body: unknown) => authRoute(new Request(`http://localhost:3000/api/auth${path}`, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(body) }));

describe("real Better Auth handlers with an isolated PostgreSQL adapter", () => {
  it("rejects public sign-up and emails outside the team allowlist", async () => {
    expect((await authRequest("/email-otp/send-verification-otp", { email: "outsider@example.test", type: "sign-in" })).status).toBe(403);
    expect(state.codes.has("outsider@example.test")).toBe(false);
    expect((await authRequest("/sign-up/email", { email: "outsider@example.test", password: "some-password", name: "Outsider" })).status).not.toBe(200);
  });
  it("verifies an emailed code, enforces roles, and revokes sessions for removed accounts", async () => {
    const sent = await authRequest("/email-otp/send-verification-otp", { email: "production@example.test", type: "sign-in" });
    expect(sent.status).toBe(200);
    const code = state.codes.get("production@example.test"); expect(code).toMatch(/^\d{6}$/);
    const response = await authRequest("/sign-in/email-otp", { email: "production@example.test", otp: code });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0]; const headers = new Headers({ cookie });
    expect(await requireAdmin(headers)).toMatchObject({ role: "production", email: "production@example.test" });
    await expect(requireAdmin(headers, true)).rejects.toThrow("administración");
    vi.stubEnv("AUTHORIZATION_PRODUCTION_EMAILS", ""); await expect(requireAdmin(headers)).rejects.toThrow("Inicia sesión");
    vi.stubEnv("AUTHORIZATION_PRODUCTION_EMAILS", "production@example.test");
  });
  it("rejects unauthenticated requests and foreign origins", async () => {
    await expect(requireAdmin(new Headers())).rejects.toThrow();
    const response = await authRoute(new Request("http://localhost:3000/api/auth/email-otp/send-verification-otp", { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.test", type: "sign-in" }) }));
    expect(response.status).toBe(403);
  });
  it("bounds login payloads before parsing or sending any code", async () => {
    const result = await authRequest("/email-otp/send-verification-otp", { email: "admin@example.test", type: "sign-in", oversized: "x".repeat(9000) });
    expect(result.status).toBe(413);
    expect(state.codes.has("admin@example.test")).toBe(false);
  });
  it("limits code requests by recipient even when the source address changes", async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await authRoute(new Request("http://localhost:3000/api/auth/email-otp/send-verification-otp", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${attempt + 1}` }, body: JSON.stringify({ email: "admin@example.test", type: "sign-in" }) }));
      expect(response.status).toBe(attempt < 3 ? 200 : 429);
    }
  });
});
