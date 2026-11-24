import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AdminPanel } from "@/components/authorizations/admin-panel";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
// jsdom exposes the element but leaves the native dialog methods unimplemented.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
  close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
});
vi.mock("@/components/authorizations/guest-flow", () => ({ authorizationApi: mocks.api }));
vi.mock("@/components/authorizations/shell", () => ({
  AuthorizationShell: ({ children }: { children: React.ReactNode }) => children,
  AuthorizationBrand: () => null,
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
const document = { id: "document-one", title: "Permiso de grabación", version: "1.0", approved_at: "2026-11-05", retired_at: null };
function overview(ready = true) {
  return { admin: { email: "admin@example.test", role: "admin" }, documents: [document, { ...document, id: "draft", title: "Uso de espacios", approved_at: null }], authorizations: [], jobs: [], scheduledEpisodes: [], readiness: { retentionConfigured: ready, mailConfigured: true } };
}
beforeEach(() => { mocks.api.mockReset(); });

async function openParticipations() {
  fireEvent.click(await screen.findByRole("button", { name: "Participaciones" }));
}

test("opens the invitation form with setup pending and explains the missing requirement", async () => {
  mocks.api.mockResolvedValue(overview(false));
  render(<AdminPanel />);
  await openParticipations();
  fireEvent.click(await screen.findByRole("button", { name: "Nueva invitación" }));
  expect(screen.getByLabelText("Documento para enviar")).toBeVisible();
  expect(screen.getByRole("button", { name: "Crear y enviar invitación" })).toBeDisabled();
  expect(screen.getByText(/Para enviar esta invitación falta/)).toHaveTextContent("conservación");
});

test("requires a published document and submits the selected version", async () => {
  mocks.api.mockResolvedValue(overview());
  render(<AdminPanel />);
  await openParticipations();
  fireEvent.click(await screen.findByRole("button", { name: "Nueva invitación" }));
  expect(screen.getByRole("option", { name: /Uso de espacios/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Crear y enviar invitación" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Nombre del invitado"), { target: { value: "Invitado de prueba" } });
  fireEvent.change(screen.getByLabelText("Correo del invitado"), { target: { value: "guest@example.test" } });
  fireEvent.change(screen.getByLabelText("Episodio / participación"), { target: { value: "Mi entrevista" } });
  fireEvent.change(screen.getByLabelText("Fecha de grabación"), { target: { value: "2027-12-10" } });
  fireEvent.change(screen.getByLabelText("Documento para enviar"), { target: { value: document.id } });
  expect(screen.getByRole("button", { name: "Leer documento seleccionado" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Crear y enviar invitación" }));
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith("admin/invite", expect.objectContaining({ documentId: document.id, email: "guest@example.test", episode: "Mi entrevista", recordingDate: "2027-12-10" })));
});

const pending = { id: "fixture", name: "Invitado de prueba", email: "guest@example.test", episode: "Entrevista", state: "pending", acceptedAt: "2026-11-05T12:00:00Z", confirmedAt: null, recordingAt: "2027-12-10T12:00:00Z" };
test.each(["confirm", "reject"])("submits an explicit administrative %s decision", async decision => {
  mocks.api.mockResolvedValue({ ...overview(), authorizations: [pending] });
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<AdminPanel />);
  await openParticipations();
  fireEvent.click(await screen.findByRole("button", { name: `${decision === "confirm" ? "Confirmar" : "Rechazar"} autorización de Invitado de prueba` }));
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith(`admin/${decision}`, decision === "confirm" ? { id: "fixture", approved: true } : { id: "fixture", rejected: true }));
  expect(confirmation).toHaveBeenCalled(); confirmation.mockRestore();
});
test("does not submit a cancelled administrative decision", async () => {
  mocks.api.mockResolvedValue({ ...overview(), authorizations: [pending] });
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<AdminPanel />);
  await openParticipations();
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar autorización de Invitado de prueba" }));
  expect(mocks.api).not.toHaveBeenCalledWith("admin/confirm", expect.anything());
  confirmation.mockRestore();
});
test("reserves decisions for administrators", async () => {
  mocks.api.mockResolvedValue({ ...overview(), admin: { email: "production@example.test", role: "production" }, authorizations: [pending] });
  render(<AdminPanel />);
  await openParticipations();
  await screen.findByRole("button", { name: "Ver expediente" });
  expect(screen.queryByRole("button", { name: "Confirmar autorización de Invitado de prueba" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Rechazar autorización de Invitado de prueba" })).toBeNull();
});

test("groups several invitations on a Chilean day, shows their states and opens the shared actions", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-24T18:00:00Z"));
  try {
    const rows = [
      { name: "Invitada aceptada", state: "confirmed", id: "accepted", confirmedAt: "2026-11-24T17:00:00Z", inviteExpires: "2026-11-23T15:00:00Z" },
      { name: "Invitado pendiente", state: "invited", id: "waiting", inviteExpires: "2026-11-26T15:00:00Z" },
      { name: "Invitada sin respuesta", state: "invited", id: "expired", inviteExpires: "2026-11-24T15:00:00Z" },
      { name: "Invitado rechazado", state: "rejected", id: "rejected" },
      { name: "Invitada anulada", state: "cancelled", id: "cancelled" },
      { name: "Invitada por confirmar", state: "pending", id: "pending", acceptedAt: "2026-11-23T16:00:00Z", inviteExpires: "2026-11-23T18:00:00Z" },
    ].map(row => ({ ...pending, recordingAt: "2026-11-26T02:00:00Z", acceptedAt: null, ...row }));
    mocks.api.mockImplementation(async (path: string) => path.startsWith("admin/detail/")
      ? { document, events: [], receiptDigest: "digest" }
      : { ...overview(), authorizations: rows });
    render(<AdminPanel />);
    expect(await screen.findByRole("button", { name: "Mes" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /25 de noviembre.*6 invitaciones/ }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Agregar al calendario" })).getByRole("button", { name: "Cerrar modal" }));
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(within(screen.getByRole("list", { name: "Días del período" })).getAllByRole("listitem")).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    expect(screen.queryByRole("list", { name: "Días del período" })).toBeNull();

    const agenda = within(screen.getByRole("list", { name: "Registros del día" }));
    expect(agenda.getByText("Aceptada")).toHaveAttribute("data-tone", "green");
    expect(agenda.getByText("Pendiente de respuesta")).toHaveAttribute("data-tone", "yellow");
    expect(agenda.getByText("Pendiente de confirmación")).toHaveAttribute("data-tone", "yellow");
    for (const status of ["Rechazada", "Anulada", "Vencida sin respuesta"]) {
      expect(agenda.getByText(status)).toHaveAttribute("data-tone", "red");
    }
    fireEvent.click(agenda.getByRole("button", { name: /Invitada aceptada/ }));
    expect(await screen.findByRole("link", { name: "Descargar comprobante PDF" })).toHaveAttribute("href", "/api/authorizations/admin/receipt/accepted");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar expediente" }));
    fireEvent.click(agenda.getByRole("button", { name: /Invitado pendiente/ }));
    expect(await screen.findByRole("button", { name: "Reenviar enlace" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar expediente" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    const modal = within(screen.getByRole("dialog", { name: "Agregar al calendario" }));
    fireEvent.click(modal.getByRole("button", { name: "Nueva invitación" }));
    expect(modal.getByLabelText("Fecha de grabación")).toHaveValue("2026-11-25");
  } finally {
    vi.useRealTimers();
  }
});

test("selects a date, offers both actions and adds a scheduled YouTube video to the agenda", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-24T18:00:00Z"));
  try {
    const scheduled = { youtubeId: "demo-video1", title: "Próximo capítulo", publishAt: "2026-11-25T22:00:00Z", format: "chapter" };
    let stored = false;
    mocks.api.mockImplementation(async (path: string) => {
      if (path === "admin/episode-schedule") { stored = true; return scheduled; }
      return { ...overview(), scheduledEpisodes: stored ? [scheduled] : [] };
    });
    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /25 de noviembre/ }));
    const modal = within(screen.getByRole("dialog", { name: "Agregar al calendario" }));
    fireEvent.click(modal.getByRole("button", { name: "Nueva invitación" }));
    expect(modal.getByLabelText("Fecha de grabación")).toHaveValue("2026-11-25");
    fireEvent.click(modal.getByRole("button", { name: "Volver a las opciones" }));
    fireEvent.click(modal.getByRole("button", { name: "Programar video de YouTube" }));
    expect(modal.getByLabelText("Fecha de publicación")).toHaveValue("2026-11-25");
    fireEvent.change(modal.getByLabelText("Título del video"), { target: { value: scheduled.title } });
    fireEvent.change(modal.getByLabelText("Enlace de YouTube"), { target: { value: "https://youtu.be/demo-video1" } });
    fireEvent.change(modal.getByLabelText("Formato de video"), { target: { value: "chapter" } });
    fireEvent.change(modal.getByLabelText(/Hora de publicación/), { target: { value: "19:00" } });
    fireEvent.click(modal.getByRole("button", { name: "Guardar programación" }));
    const agenda = within(await screen.findByRole("list", { name: "Registros del día" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(agenda.getByText("Programado")).toHaveAttribute("data-tone", "blue");
    fireEvent.click(agenda.getByRole("button", { name: /Próximo capítulo/ }));
    expect(screen.getByRole("link", { name: "Abrir enlace en YouTube" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=demo-video1");
    fireEvent.click(screen.getByRole("button", { name: "Editar video" }));
    const edit = within(screen.getByRole("dialog", { name: "Agregar al calendario" }));
    expect(edit.getByLabelText("Título del video")).toHaveValue(scheduled.title);
    expect(edit.getByLabelText(/Hora de publicación/)).toHaveValue("19:00");
  } finally {
    vi.useRealTimers();
  }
});

test("prefills an editable invitation and submits the corrected address", async () => {
  const row = { ...pending, id: "to-edit", state: "invited", acceptedAt: null, documentId: document.id };
  mocks.api.mockImplementation(async (path: string) => {
    if (path === "admin/detail/to-edit") return { document, events: [], receiptDigest: null };
    if (path === "admin/invite/to-edit") return { id: row.id, updated: true };
    return { ...overview(), authorizations: [row] };
  });
  render(<AdminPanel />);
  await openParticipations();
  fireEvent.click(await screen.findByRole("button", { name: "Ver expediente" }));
  fireEvent.click(await screen.findByRole("button", { name: "Editar invitación" }));
  expect(screen.getByLabelText("Correo del invitado")).toHaveValue(row.email);
  expect(screen.getByLabelText("Documento para enviar")).toHaveValue(document.id);
  fireEvent.change(screen.getByLabelText("Correo del invitado"), { target: { value: "corregido@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios y reenviar" }));
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith("admin/invite/to-edit", expect.objectContaining({ email: "corregido@example.test" })));
});

test("opens the weekly agenda on mobile and adds to the chosen date", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-24T18:00:00Z"));
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  try {
    mocks.api.mockResolvedValue(overview());
    render(<AdminPanel />);
    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /26 de noviembre/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: /jueves 26/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    const modal = within(screen.getByRole("dialog", { name: "Agregar al calendario" }));
    fireEvent.click(modal.getByRole("button", { name: "Programar video de YouTube" }));
    expect(modal.getByLabelText("Fecha de publicación")).toHaveValue("2026-11-26");
  } finally {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});
