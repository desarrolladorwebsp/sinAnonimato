import { expect, test } from "vitest";
import {
  clientConfirmationEmail,
  teamNotificationEmail,
} from "@/lib/contact-email";
import { validateContact } from "@/lib/contact";

const message = {
  name: "Ana <script>",
  email: "ana@correo.com",
  phone: "",
  story: "Línea uno\n<script>alert(1)</script>",
};

test("el correo al cliente avisa la recepción y se adapta a claro y oscuro", () => {
  const email = clientConfirmationEmail(message);

  expect(email.subject).toBe("Recibimos tu historia — Sin Anonimato");
  expect(email.text).toContain("te responderemos a este correo");
  expect(email.text).toContain("Línea uno");
  expect(email.html).toContain("cid:sin-anonimato-logo");
  expect(email.html).toContain("prefers-color-scheme: dark");
  expect(email.html).toContain('name="color-scheme" content="light dark"');
  expect(email.html).toContain("[data-ogsc]");
  expect(email.html).toContain("#000000");
  expect(email.html).toContain("#ffffff");
  expect(email.html).toContain("#ff2a2a");
  expect(email.html).toContain("#f3f3f3");
  expect(email.html).toContain("Ana &lt;script&gt;");
  expect(email.html).toContain("Línea uno<br>&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(email.html).not.toContain("<script>");
});

test("el correo interno incluye el caso y el contacto", () => {
  const email = teamNotificationEmail(message, new Date("2026-10-10T17:00:00.000Z"));

  expect(email.subject).toBe("Nuevo contacto: Ana <script>");
  expect(email.html).toContain("Un cliente quiere contactarnos");
  expect(email.html).toContain("mailto:ana@correo.com");
  expect(email.html).toContain("No lo indicó");
  expect(email.html).toContain("Historia");
  expect(email.html).not.toContain("<script>");
  expect(email.text).toContain("Responder a este mensaje escribe directamente a la persona.");
  expect(email.text).toContain("ana@correo.com");
});

test("rechaza un formulario incompleto", () => {
  const result = validateContact({
    name: "A",
    email: "no-es-correo",
    phone: "1".repeat(41),
    story: "corto",
  });

  expect(result.value).toBeNull();
  expect(result.errors).toEqual({
    name: "Escribe tu nombre.",
    email: "Escribe un correo válido.",
    phone: "El teléfono es demasiado largo.",
    story: "Cuéntanos tu caso.",
  });
});
