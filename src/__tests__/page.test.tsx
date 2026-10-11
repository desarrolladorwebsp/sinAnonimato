import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Page from "../app/page";

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

test("muestra el hero, el formulario y el pie", () => {
  render(<Page />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Próximamente" }),
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
  expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
});

test("el formulario pide los datos obligatorios", () => {
  render(<Page />);

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
  render(<Page />);
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
  render(<Page />);
  fillCase();

  fireEvent.click(screen.getByRole("button", { name: /enviar mi caso/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /no pudimos enviar tu caso/i,
  );
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana Ruiz");
});
