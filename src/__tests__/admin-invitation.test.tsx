import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AdminPanel } from "@/components/authorizations/admin-panel";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/components/authorizations/guest-flow", () => ({ authorizationApi: mocks.api }));
vi.mock("@/components/authorizations/shell", () => ({ AuthorizationShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
const document = { id: "document-one", title: "Permiso de grabación", version: "1.0", approved_at: "2026-11-05", retired_at: null };
function overview(ready = true) {
  return { admin: { email: "admin@example.test", role: "admin" }, documents: [document, { ...document, id: "draft", title: "Uso de espacios", approved_at: null }], authorizations: [], jobs: [], readiness: { retentionConfigured: ready, mailConfigured: true } };
}
beforeEach(() => { mocks.api.mockReset(); });

test("opens the invitation form with setup pending and explains the missing requirement", async () => {
  mocks.api.mockResolvedValue(overview(false));
  render(<AdminPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Nueva invitación" }));
  expect(screen.getByLabelText("Documento para enviar")).toBeVisible();
  expect(screen.getByRole("button", { name: "Crear y enviar invitación" })).toBeDisabled();
  expect(screen.getByText(/Para enviar esta invitación falta/)).toHaveTextContent("conservación");
});

test("requires a published document and submits the selected version", async () => {
  mocks.api.mockResolvedValue(overview());
  render(<AdminPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Nueva invitación" }));
  expect(screen.getByRole("option", { name: /Uso de espacios/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Crear y enviar invitación" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Nombre del invitado"), { target: { value: "Invitado de prueba" } });
  fireEvent.change(screen.getByLabelText("Correo del invitado"), { target: { value: "guest@example.test" } });
  fireEvent.change(screen.getByLabelText("Episodio / participación"), { target: { value: "Mi entrevista" } });
  fireEvent.change(screen.getByLabelText("Fecha de grabación (hora de este dispositivo)"), { target: { value: "2027-12-10T12:00" } });
  fireEvent.change(screen.getByLabelText("Documento para enviar"), { target: { value: document.id } });
  expect(screen.getByRole("button", { name: "Leer documento seleccionado" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Crear y enviar invitación" }));
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith("admin/invite", expect.objectContaining({ documentId: document.id, email: "guest@example.test", episode: "Mi entrevista" })));
});

const pending = { id: "fixture", name: "Invitado de prueba", email: "guest@example.test", episode: "Entrevista", state: "pending", acceptedAt: "2026-11-05T12:00:00Z", confirmedAt: null, recordingAt: "2027-12-10T12:00:00Z" };
test.each(["confirm", "reject"])("submits an explicit administrative %s decision", async decision => {
  mocks.api.mockResolvedValue({ ...overview(), authorizations: [pending] });
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<AdminPanel />);
  fireEvent.click(await screen.findByRole("button", { name: `${decision === "confirm" ? "Confirmar" : "Rechazar"} autorización de Invitado de prueba` }));
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith(`admin/${decision}`, decision === "confirm" ? { id: "fixture", approved: true } : { id: "fixture", rejected: true }));
  expect(confirmation).toHaveBeenCalled(); confirmation.mockRestore();
});
test("does not submit a cancelled administrative decision", async () => {
  mocks.api.mockResolvedValue({ ...overview(), authorizations: [pending] });
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<AdminPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar autorización de Invitado de prueba" }));
  expect(mocks.api).not.toHaveBeenCalledWith("admin/confirm", expect.anything());
  confirmation.mockRestore();
});
test("reserves decisions for administrators", async () => {
  mocks.api.mockResolvedValue({ ...overview(), admin: { email: "production@example.test", role: "production" }, authorizations: [pending] });
  render(<AdminPanel />);
  await screen.findByRole("button", { name: "Ver expediente" });
  expect(screen.queryByRole("button", { name: "Confirmar autorización de Invitado de prueba" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Rechazar autorización de Invitado de prueba" })).toBeNull();
});
