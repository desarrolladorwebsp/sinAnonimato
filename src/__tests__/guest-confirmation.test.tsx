import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { GuestFlow } from "@/components/authorizations/guest-flow";
vi.mock("@/components/authorizations/shell", () => ({ AuthorizationShell: ({ children }: { children: React.ReactNode }) => children }));
const details = { episode: "Entrevista de prueba", documentTitle: "Permiso de grabación", documentVersion: "1.0" };
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); fetchMock.mockImplementation(async () => ({ ok: true, json: async () => details })); });
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });
test("exchanges the fragment before removing it and recovers confirmation after reload", async () => {
  window.history.replaceState(null, "", "/autorizacion/confirmar#fixture-token");
  const { unmount } = render(<GuestFlow confirm />);
  expect(await screen.findByRole("button", { name: "Confirmar mi autorización" })).toBeEnabled();
  expect(fetchMock).toHaveBeenCalledWith("/api/authorizations/guest/verification", expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "fixture-token" }) }));
  expect(window.location.hash).toBe("");
  unmount(); fetchMock.mockClear();
  render(<GuestFlow confirm />);
  expect(await screen.findByRole("button", { name: "Confirmar mi autorización" })).toBeEnabled();
  expect(fetchMock).toHaveBeenCalledWith("/api/authorizations/guest/confirmation", expect.objectContaining({ method: "GET" }));
  expect(fetchMock).not.toHaveBeenCalledWith("/api/authorizations/guest/confirm", expect.anything());
});
test("requires a deliberate button press and submits without exposing the cookie token", async () => {
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith("guest/me") ? { state: "confirmed", name: "Prueba", email: "guest@example.test", episode: "Entrevista", confirmedAt: "2026-11-05T12:00:00Z", document: { title: "Permiso", version: "1.0" } } : details }));
  render(<GuestFlow confirm />);
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar mi autorización" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/authorizations/guest/confirm", expect.objectContaining({ method: "POST", body: "{}" })));
  await screen.findByRole("link", { name: /Descargar comprobante/ });
});
test("keeps a failed link available for retry and prevents confirmation", async () => {
  window.history.replaceState(null, "", "/autorizacion/confirmar#fixture-token");
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Enlace vencido" }) });
  render(<GuestFlow confirm />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Enlace vencido");
  expect(screen.getByRole("button", { name: "Confirmar mi autorización" })).toBeDisabled();
  expect(window.location.hash).toBe("#fixture-token");
});
