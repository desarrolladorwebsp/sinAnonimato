// @vitest-environment node

import { afterEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/contacto/route";
import {
  ContactMailError,
  createResendTransport,
  deliverContact,
  type OutboundMail,
} from "@/lib/send-contact";

const send = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM;

const message = {
  name: "Ana Ruiz",
  email: "ana@correo.com",
  phone: "+56911111111",
  story: "Quiero contar mi historia.",
};

function restore(name: "RESEND_API_KEY" | "RESEND_FROM", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restore("RESEND_API_KEY", originalKey);
  restore("RESEND_FROM", originalFrom);
  send.mockReset();
  vi.restoreAllMocks();
});

test("avisa al equipo y después confirma al cliente", async () => {
  delete process.env.RESEND_FROM;
  const sent: OutboundMail[] = [];
  const result = await deliverContact(
    message,
    async (mail) => {
      sent.push(mail);
    },
    { receivedAt: new Date("2026-10-10T17:00:00.000Z") },
  );

  expect(result.confirmationSent).toBe(true);
  expect(sent.map((mail) => mail.to)).toEqual(["contacto@sinanonimato.cl", "ana@correo.com"]);
  expect(sent[0]?.replyTo).toBe("ana@correo.com");
  expect(sent[1]?.replyTo).toBe("contacto@sinanonimato.cl");
  expect(sent.every((mail) => mail.from === "Sin Anonimato <contacto@sinanonimato.cl>")).toBe(true);
  expect(sent[0]?.attachments[0]?.content.subarray(0, 4).toString("hex")).toBe("89504e47");
  expect(sent[0]?.html).toContain("cid:sin-anonimato-logo");
});

test("conserva el aviso interno si falla la confirmación al cliente", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const sent: string[] = [];

  const result = await deliverContact(message, async (mail) => {
    sent.push(mail.to);
    if (mail.category === "client") {
      throw new Error("buzón lleno");
    }
  });

  expect(sent).toEqual(["contacto@sinanonimato.cl", "ana@correo.com"]);
  expect(result.confirmationSent).toBe(false);
});

test("no usa un remitente fuera de sinanonimato.cl", async () => {
  process.env.RESEND_FROM = "Otro <hola@gmail.com>";

  await expect(deliverContact(message, async () => undefined)).rejects.toBeInstanceOf(ContactMailError);
});

test("Resend recibe los dos correos con el logo", async () => {
  process.env.RESEND_API_KEY = "re_test";
  delete process.env.RESEND_FROM;
  send.mockResolvedValue({ data: { id: "email_1" }, error: null });
  const transport = createResendTransport();

  await deliverContact(message, transport, {
    receivedAt: new Date("2026-10-10T17:00:00.000Z"),
  });

  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0]?.[0]).toMatchObject({
    from: "Sin Anonimato <contacto@sinanonimato.cl>",
    to: "contacto@sinanonimato.cl",
    replyTo: "ana@correo.com",
    subject: "Nuevo contacto: Ana Ruiz",
    tags: [
      { name: "category", value: "contact-form" },
      { name: "audience", value: "team" },
    ],
  });
  expect(send.mock.calls[1]?.[0].to).toBe("ana@correo.com");
  expect(send.mock.calls[0]?.[0].attachments[0].contentId).toBe("sin-anonimato-logo");
});

test("el endpoint rechaza datos inválidos y falta de clave", async () => {
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  const invalid = await POST(new Request("http://localhost/api/contacto", { method: "POST", body: "{" }));
  expect(invalid.status).toBe(400);

  const missing = await POST(
    new Request("http://localhost/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    }),
  );
  expect(missing.status).toBe(503);
  expect(send).not.toHaveBeenCalled();
});

test("el endpoint envía el formulario cuando Resend responde", async () => {
  process.env.RESEND_API_KEY = "re_test";
  delete process.env.RESEND_FROM;
  send.mockResolvedValue({ data: { id: "email_1" }, error: null });

  const response = await POST(
    new Request("http://localhost/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    }),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, confirmationSent: true });
  expect(send).toHaveBeenCalledTimes(2);
});
