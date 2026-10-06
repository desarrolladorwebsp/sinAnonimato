import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import Page from "../app/page";

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
