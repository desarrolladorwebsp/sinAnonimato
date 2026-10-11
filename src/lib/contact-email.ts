import type { ContactMessage } from "@/lib/contact";

export const TEAM_INBOX = "contacto@sinanonimato.cl";
export const DEFAULT_FROM = "Sin Anonimato <contacto@sinanonimato.cl>";
export const LOGO_CID = "sin-anonimato-logo";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type EmailContent = {
  preheader: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  panelTitle?: string;
  panelHtml?: string;
  panelText?: string;
  footer: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

export function formatReceivedAt(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(date);
}

function subjectName(name: string) {
  return name.replace(/\s+/g, " ").slice(0, 80);
}

function layout(content: EmailContent) {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p class="email-text" style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#242424;">${toHtml(paragraph)}</p>`,
    )
    .join("");

  const panel = content.panelHtml
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-panel" bgcolor="#f6f6f6" style="margin:8px 0 20px;background-color:#f6f6f6;border-left:4px solid #ff2a2a;border-radius:8px;">
        <tr>
          <td style="padding:16px 18px;">
            ${
              content.panelTitle
                ? `<p class="email-label" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#666666;">${escapeHtml(content.panelTitle)}</p>`
                : ""
            }
            ${content.panelHtml}
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(content.title)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body, table, td, p, a { font-family: Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif; }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #050505 !important; }
      .email-card { background-color: #121212 !important; border-color: #2c2c2c !important; }
      .email-header { background-color: #000000 !important; }
      .email-rule { background-color: #ff2a2a !important; }
      .email-text, .email-text p { color: #f5f5f5 !important; }
      .email-muted, .email-muted p { color: #c8c8c8 !important; }
      .email-label { color: #b5b5b5 !important; }
      .email-panel { background-color: #1b1b1b !important; }
      .email-link { color: #f5f5f5 !important; }
      .email-row { border-bottom-color: #333333 !important; }
    }
    [data-ogsc] .email-text, [data-ogsc] .email-text p { color: #f5f5f5 !important; }
    [data-ogsc] .email-muted, [data-ogsc] .email-muted p { color: #c8c8c8 !important; }
    [data-ogsc] .email-label { color: #b5b5b5 !important; }
    [data-ogsc] .email-link { color: #f5f5f5 !important; }
    [data-ogsb] .email-bg { background-color: #050505 !important; }
    [data-ogsb] .email-card { background-color: #121212 !important; }
    [data-ogsb] .email-panel { background-color: #1b1b1b !important; }
    [data-ogsb] .email-header { background-color: #000000 !important; }
    [data-ogsc] .email-row { border-bottom-color: #333333 !important; }
  </style>
</head>
<body class="email-bg" bgcolor="#f3f3f3" style="margin:0;padding:0;background-color:#f3f3f3;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f3f3;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" bgcolor="#f3f3f3" style="background-color:#f3f3f3;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" bgcolor="#ffffff" style="max-width:560px;background-color:#ffffff;border:1px solid #e6e6e6;border-radius:18px;overflow:hidden;">
          <tr>
            <td class="email-header" align="center" bgcolor="#000000" style="background-color:#000000;padding:28px 24px 22px;">
              <img src="cid:${LOGO_CID}" alt="Sin Anonimato" width="300" border="0" style="display:block;width:300px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td class="email-rule" bgcolor="#ff2a2a" height="4" style="height:4px;background-color:#ff2a2a;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;">
              <p class="email-label" style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ff2a2a;">${escapeHtml(content.eyebrow)}</p>
              <h1 class="email-text" style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-.03em;color:#111111;">${escapeHtml(content.title)}</h1>
              ${paragraphs}
              ${panel}
            </td>
          </tr>
          <tr>
            <td class="email-muted" style="padding:4px 28px 28px;font-size:13px;line-height:1.6;color:#5c5c5c;">
              <p style="margin:0 0 8px;">${toHtml(content.footer)}</p>
              <p style="margin:0;">Sin Anonimato · Historias reales. Voces que importan.<br>contacto@sinanonimato.cl</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function clientConfirmationEmail(message: ContactMessage): RenderedEmail {
  const panelHtml = `<p class="email-text" style="margin:0;font-size:15px;line-height:1.65;color:#1a1a1a;">${toHtml(message.story)}</p>`;

  return {
    subject: "Recibimos tu historia — Sin Anonimato",
    text: [
      "Sin Anonimato",
      "",
      `Hola ${message.name},`,
      "",
      "Recibimos tu formulario. Gracias por escribirnos y por confiar en nosotros.",
      "Vamos a revisar tu historia y te responderemos a este correo.",
      "Tu información se trata con confidencialidad.",
      "",
      "Esto es lo que nos contaste:",
      message.story,
      "",
      "Si no enviaste este formulario, puedes ignorar este mensaje.",
      "",
      "Sin Anonimato",
      "contacto@sinanonimato.cl",
    ].join("\n"),
    html: layout({
      preheader: "Recibimos tu formulario y te responderemos pronto.",
      eyebrow: "Recibido",
      title: `Hola ${message.name}, ya tenemos tu historia`,
      paragraphs: [
        "Recibimos tu formulario. Gracias por escribirnos y por confiar en Sin Anonimato.",
        "Vamos a revisar tu historia y te responderemos a este correo. Tu información se trata con confidencialidad.",
      ],
      panelTitle: "Esto es lo que nos contaste",
      panelHtml,
      footer: "Si no enviaste este formulario, puedes ignorar este mensaje.",
    }),
  };
}

export function teamNotificationEmail(
  message: ContactMessage,
  receivedAt: Date,
): RenderedEmail {
  const rows = [
    ["Nombre", message.name],
    ["Correo", message.email],
    ["Teléfono", message.phone || "No lo indicó"],
    ["Recibido", formatReceivedAt(receivedAt)],
  ];

  const panelHtml = [
    ...rows.map(([label, value], index) => {
      const valueHtml =
        label === "Correo"
          ? `<a class="email-link" href="mailto:${escapeHtml(message.email)}" style="color:#161616;text-decoration:underline;">${escapeHtml(value)}</a>`
          : `<span class="email-text" style="color:#161616;">${escapeHtml(value)}</span>`;
      const border = index === rows.length - 1 ? "" : "email-row";
      return `<p class="${border}" style="margin:0;padding:10px 0;${border ? "border-bottom:1px solid #e4e4e4;" : ""}font-size:14px;line-height:1.5;"><span class="email-label" style="display:block;margin-bottom:2px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6b6b6b;">${escapeHtml(label)}</span>${valueHtml}</p>`;
    }),
    `<p class="email-label" style="margin:16px 0 8px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6b6b6b;">Historia</p>`,
    `<p class="email-text" style="margin:0;font-size:15px;line-height:1.65;color:#1a1a1a;">${toHtml(message.story)}</p>`,
  ].join("");

  return {
    subject: `Nuevo contacto: ${subjectName(message.name)}`,
    text: [
      "Sin Anonimato",
      "",
      "Un cliente quiere contactarnos.",
      "",
      `Nombre: ${message.name}`,
      `Correo: ${message.email}`,
      `Teléfono: ${message.phone || "No lo indicó"}`,
      `Recibido: ${formatReceivedAt(receivedAt)}`,
      "",
      "Historia:",
      message.story,
      "",
      "Responder a este mensaje escribe directamente a la persona.",
      "",
      "contacto@sinanonimato.cl",
    ].join("\n"),
    html: layout({
      preheader: `${message.name} envió el formulario de contacto.`,
      eyebrow: "Nuevo caso",
      title: "Un cliente quiere contactarnos",
      paragraphs: [
        "Llegó un formulario desde el sitio. Estos son los datos para responder.",
      ],
      panelTitle: "Datos del contacto",
      panelHtml,
      footer: "Responder a este mensaje escribe directamente a la persona.",
    }),
  };
}
