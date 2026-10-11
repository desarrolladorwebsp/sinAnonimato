import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import type { ContactMessage } from "@/lib/contact";
import {
  clientConfirmationEmail,
  DEFAULT_FROM,
  LOGO_CID,
  TEAM_INBOX,
  teamNotificationEmail,
} from "@/lib/contact-email";

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
};

export type OutboundMail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  attachments: MailAttachment[];
  category: "team" | "client";
};

export class ContactMailError extends Error {
  readonly code: "missing_key" | "delivery_failed";

  constructor(message: string, code: "missing_key" | "delivery_failed") {
    super(message);
    this.name = "ContactMailError";
    this.code = code;
  }
}

export function resolveFromAddress() {
  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
  const email = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();

  if (!email.endsWith("@sinanonimato.cl")) {
    throw new ContactMailError(
      "RESEND_FROM debe usar el dominio sinanonimato.cl",
      "delivery_failed",
    );
  }

  return from;
}

export async function readLogoAttachment(): Promise<MailAttachment> {
  const filePath = path.join(process.cwd(), "public", "images", "sin-anonimato-logo.png");
  const content = await readFile(filePath);

  return {
    filename: "sin-anonimato-logo.png",
    content,
    contentType: "image/png",
    contentId: LOGO_CID,
  };
}

export async function deliverContact(
  message: ContactMessage,
  send: (mail: OutboundMail) => Promise<void>,
  options?: { receivedAt?: Date; logo?: MailAttachment },
) {
  const receivedAt = options?.receivedAt ?? new Date();
  const from = resolveFromAddress();
  const logo = options?.logo ?? (await readLogoAttachment());
  const team = teamNotificationEmail(message, receivedAt);
  const client = clientConfirmationEmail(message);

  await send({
    from,
    to: TEAM_INBOX,
    replyTo: message.email,
    subject: team.subject,
    html: team.html,
    text: team.text,
    attachments: [logo],
    category: "team",
  });

  try {
    await send({
      from,
      to: message.email,
      replyTo: TEAM_INBOX,
      subject: client.subject,
      html: client.html,
      text: client.text,
      attachments: [logo],
      category: "client",
    });
  } catch {
    console.error("Contacto: la confirmación al cliente no se envió");
    return { confirmationSent: false };
  }

  return { confirmationSent: true };
}

export function createResendTransport(apiKey = process.env.RESEND_API_KEY) {
  const key = apiKey?.trim();

  if (!key) {
    throw new ContactMailError("Falta RESEND_API_KEY", "missing_key");
  }

  const resend = new Resend(key);

  return async (mail: OutboundMail) => {
    const { error } = await resend.emails.send({
      from: mail.from,
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tags: [
        { name: "category", value: "contact-form" },
        { name: "audience", value: mail.category },
      ],
      attachments: mail.attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
        contentId: file.contentId,
      })),
    });

    if (error) {
      throw new ContactMailError(error.message, "delivery_failed");
    }
  };
}
