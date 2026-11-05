// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthorizationError } from "@/lib/authorizations/config";
import { proxy } from "@/proxy";
import { POST } from "@/app/api/contacto/route";

const mocks = vi.hoisted(() => ({ quota: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/authorizations/http", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/authorizations/http")>(), rateLimit: mocks.quota,
}));
vi.mock("@/lib/send-contact", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/send-contact")>(),
  createResendTransport: () => mocks.send,
  deliverContact: mocks.send,
}));
beforeEach(() => { vi.stubEnv("APP_URL", "https://www.sinanonimato.cl"); mocks.send.mockResolvedValue({ confirmationSent: true }); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (body: string, origin = "https://www.sinanonimato.cl", type = "application/json") => new Request("https://www.sinanonimato.cl/api/contacto", { method: "POST", headers: { Origin: origin, "Content-Type": type }, body });

describe("contact form abuse boundaries", () => {
  it("rejects cross-site and non-JSON requests without sending mail", async () => {
    expect((await POST(request("{}", "https://attacker.example"))).status).toBe(403);
    expect((await POST(request("{}", undefined, "text/plain"))).status).toBe(415);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.quota).not.toHaveBeenCalled();
  });
  it("limits streamed bytes without trusting Content-Length", async () => {
    expect((await POST(request(JSON.stringify({ story: "a".repeat(24001) })))).status).toBe(413);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("fails closed when a persistent quota is exceeded", async () => {
    mocks.quota.mockRejectedValueOnce(new AuthorizationError(429, "quota"));
    const response = await POST(request(JSON.stringify({ name: "Persona prueba", email: "test@example.test", phone: "", story: "Solicitud de prueba" })));
    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

it("generates independent production nonces and overwrites attacker-supplied policies", () => {
  vi.stubEnv("NODE_ENV", "production");
  const request = new NextRequest("https://www.sinanonimato.cl/admin/autorizaciones", { headers: { "Content-Security-Policy": "script-src 'unsafe-inline'", "x-nonce": "attacker" } });
  const first = proxy(request), second = proxy(request);
  const policy = first.headers.get("content-security-policy")!;
  expect(policy).not.toBe(second.headers.get("content-security-policy"));
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("connect-src 'self'");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy.split(";").map(value => value.trim()).find(value => value.startsWith("script-src "))).not.toContain("'unsafe-inline'");
  expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
  expect(first.headers.get("cache-control")).toContain("no-store");
});
