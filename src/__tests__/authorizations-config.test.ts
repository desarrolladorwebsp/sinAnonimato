// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { appOrigin, settings, readiness } from "@/lib/authorizations/config";
import { GET as cronGet, POST as cronPost } from "@/app/api/internal/authorizations/route";

afterEach(() => vi.unstubAllEnvs());
describe("activation without an approved legal policy", () => {
  it("allows the panel origin while invitations remain blocked without retention approval", () => {
    vi.stubEnv("APP_URL", "https://www.sinanonimato.cl");
    vi.stubEnv("AUTHORIZATION_RETENTION_DAYS", "");
    vi.stubEnv("AUTHORIZATION_RETENTION_POLICY", "");
    expect(appOrigin()).toBe("https://www.sinanonimato.cl");
    expect(readiness().retentionConfigured).toBe(false);
    expect(() => settings()).toThrow("política de conservación");
  });
  it("rejects unauthenticated cron invocations through both supported methods", async () => {
    vi.stubEnv("CRON_SECRET", "test-only-cron-secret-that-is-long-enough");
    for (const handler of [cronGet, cronPost]) {
      expect((await handler(new Request("https://www.sinanonimato.cl/api/internal/authorizations"))).status).toBe(401);
      expect((await handler(new Request("https://www.sinanonimato.cl/api/internal/authorizations", { headers: { Authorization: "Bearer incorrect" } }))).status).toBe(401);
    }
  });
});
