import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Page from "../app/page";
import { StoryForm } from "@/components/story-form";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/lib/podcast", () => ({ getEpisodes: async () => [{ id: "xNfdDPhmEMU", title: "Capítulo 1: Artistas callejeros", description: "El primer capítulo.", duration: "", publishedAt: "", embeddable: true }] }));
vi.mock("@/components/review-carousel", () => ({ ReviewsSection: () => null }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillCase() {
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Ana Ruiz" },
  });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "ana@correo.com" },
  });
  fireEvent.change(screen.getByLabelText("Teléfono (opcional)"), {
    target: { value: "+56911111111" },
  });
  fireEvent.change(screen.getByLabelText("Cuéntanos brevemente tu caso."), {
    target: { value: "Quiero contar mi historia." },
  });
}

vi.mock("next/image", () => ({
  default: () => null,
}));

test("muestra el último capítulo, Shorts, formulario y pie", async () => {
  render(await Page());

  expect(screen.queryByRole("heading", { name: "Capítulo 1: Artistas callejeros" })).not.toBeInTheDocument();

  expect(
    screen.getByRole("link", { name: "Capítulo 1: Artistas callejeros" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 2, name: /envíanos tu caso/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
  expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
  expect(screen.getByLabelText("Teléfono (opcional)")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Cuéntanos brevemente tu caso."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ver último capítulo" })).toHaveAttribute("href", "/capitulos/xNfdDPhmEMU");
  expect(screen.getByRole("heading", { name: "Historias en pocos minutos." })).toBeInTheDocument();
  expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
});

test("el formulario pide los datos obligatorios", () => {
  render(<StoryForm />);

  fireEvent.click(screen.getByRole("button", { name: /enviar mi caso/i }));

  expect(screen.getByText("Escribe tu nombre.")).toBeInTheDocument();
  expect(screen.getByText("Escribe un correo válido.")).toBeInTheDocument();
  expect(screen.getByText("Cuéntanos tu caso.")).toBeInTheDocument();
});

test("envía el caso y confirma que llegará un correo", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, confirmationSent: true }),
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<StoryForm />);
  fillCase();

  fireEvent.click(screen.getByRole("button", { name: /enviar mi caso/i }));

  expect(
    await screen.findByText(/recibimos tu historia y te responderemos pronto/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Te enviamos una confirmación a ana@correo.com."),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/contacto",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        name: "Ana Ruiz",
        email: "ana@correo.com",
        phone: "+56911111111",
        story: "Quiero contar mi historia.",
      }),
    }),
  );
});

test("avisa si el envío falla y conserva los datos", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ ok: false }),
    }),
  );
  render(<StoryForm />);
  fillCase();

  fireEvent.click(screen.getByRole("button", { name: /enviar mi caso/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /no pudimos enviar tu caso/i,
  );
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana Ruiz");
});
