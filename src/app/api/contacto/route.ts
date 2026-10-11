import { validateContact, type ContactErrors } from "@/lib/contact";
import { ContactMailError, createResendTransport, deliverContact } from "@/lib/send-contact";

function fieldSource(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { name: "", email: "", phone: "", story: "" };
  }

  const record = payload as Record<string, unknown>;
  return {
    name: record.name,
    email: record.email,
    phone: record.phone,
    story: record.story,
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { value, errors } = validateContact(fieldSource(payload));

  if (!value) {
    return Response.json({ ok: false, errors: errors satisfies ContactErrors }, { status: 400 });
  }

  try {
    const result = await deliverContact(value, createResendTransport());
    return Response.json({ ok: true, confirmationSent: result.confirmationSent });
  } catch (error) {
    if (error instanceof ContactMailError && error.code === "missing_key") {
      console.error("Contacto: falta RESEND_API_KEY");
      return Response.json({ ok: false }, { status: 503 });
    }

    console.error("Contacto: no se pudo enviar el correo");
    return Response.json({ ok: false }, { status: 500 });
  }
}
