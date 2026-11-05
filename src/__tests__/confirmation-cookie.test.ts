// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
import { setConfirmation, clearConfirmation, confirmationToken } from "@/lib/authorizations/http";
beforeEach(() => { vi.clearAllMocks(); });
it("stores the verification token only in a scoped HttpOnly cookie and clears it with the same scope", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const expires = new Date(Date.now() + 1800000).toISOString();
  await setConfirmation("fixture-token", expires);
  expect(jar.set).toHaveBeenCalledWith("sa_confirmation", "fixture-token", { httpOnly: true, secure: true, sameSite: "strict", path: "/api/authorizations", expires: new Date(expires) });
  jar.get.mockReturnValue({ value: "fixture-token" }); expect(await confirmationToken()).toBe("fixture-token");
  await clearConfirmation();
  expect(jar.set).toHaveBeenLastCalledWith("sa_confirmation", "", expect.objectContaining({ httpOnly: true, secure: true, sameSite: "strict", path: "/api/authorizations", maxAge: 0 }));
  vi.unstubAllEnvs();
});
