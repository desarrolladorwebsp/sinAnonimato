import { validateContact, type ContactErrors } from "@/lib/contact";
import { ContactMailError, createResendTransport, deliverContact } from "@/lib/send-contact";
import { AuthorizationError } from "@/lib/authorizations/config";
import { database } from "@/lib/authorizations/db";
import { body, privateHeaders, rateLimit, sameOrigin } from "@/lib/authorizations/http";

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
    sameOrigin(request);
    payload = await body(request, 24000);
  } catch (error) {
    return Response.json({ ok: false }, { status: error instanceof AuthorizationError ? error.status : 400, headers: privateHeaders });
  }

  const { value, errors } = validateContact(fieldSource(payload));

  if (!value) {
    return Response.json({ ok: false, errors: errors satisfies ContactErrors }, { status: 400, headers: privateHeaders });
  }

  try {
    const transport = createResendTransport();
    const db = database();
    // Persistent quotas work across serverless instances and do not store IPs or raw emails.
    await rateLimit(db, "contact:global", 10, 60);
    await rateLimit(db, `contact:recipient:${value.email.toLowerCase()}`, 2, 600);
    const result = await deliverContact(value, transport);
    return Response.json({ ok: true, confirmationSent: result.confirmationSent }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ ok: false }, { status: error.status, headers: privateHeaders });
    if (error instanceof ContactMailError && error.code === "missing_key") {
      console.error("Contacto: falta RESEND_API_KEY");
      return Response.json({ ok: false }, { status: 503, headers: privateHeaders });
    }

    console.error("Contacto: no se pudo enviar el correo");
    return Response.json({ ok: false }, { status: 503, headers: privateHeaders });
  }
}
