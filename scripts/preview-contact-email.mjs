import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".preview");

const sample = {
  name: "alfredo test",
  email: "soyalfredo.dev@gmail.com",
  phone: "",
  story:
    "Prueba de desarrollo del formulario de contacto. Mensaje para ver cómo se vería el correo que llega a contacto@sinanonimato.cl.",
};

function readArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : fallback;
}

function withoutDarkQuery(html) {
  const marker = "@media (prefers-color-scheme: dark)";
  const start = html.indexOf(marker);
  if (start < 0) return html;

  let depth = 0;
  for (let index = html.indexOf("{", start); index < html.length; index += 1) {
    if (html[index] === "{") depth += 1;
    if (html[index] === "}") depth -= 1;
    if (depth === 0) {
      return `${html.slice(0, start)}${html.slice(index + 1)}`;
    }
  }

  return html;
}

function forceDark(html) {
  return html.replace("@media (prefers-color-scheme: dark)", "@media all");
}

function withLogo(html, logoSrc) {
  return html.replaceAll("cid:sin-anonimato-logo", logoSrc);
}

function page(title, emails) {
  const frames = emails
    .map(
      (email) => `<section>
        <h2>${email.title}</h2>
        <p>${email.note}</p>
        <iframe title="${email.title}" data-light="${email.light}" data-dark="${email.dark}" src="${email.light}"></iframe>
      </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #050505;
      color: #f5f5f5;
      font-family: Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      max-width: 920px;
      margin: 0 auto;
      padding: 28px 20px 8px;
    }
    h1 { margin: 0; font-size: 22px; letter-spacing: -0.03em; }
    p { margin: 6px 0 0; color: #b5b5b5; font-size: 14px; line-height: 1.5; }
    .switch { display: flex; gap: 8px; }
    button {
      border: 1px solid #2c2c2c;
      background: #121212;
      color: #f5f5f5;
      border-radius: 999px;
      padding: 8px 14px;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    button[aria-pressed="true"] { background: #ff2a2a; border-color: #ff2a2a; }
    main { max-width: 920px; margin: 0 auto; padding: 12px 20px 48px; }
    section { margin-top: 28px; }
    h2 { margin: 0; font-size: 16px; }
    iframe {
      width: 100%;
      height: 920px;
      margin-top: 12px;
      border: 1px solid #2c2c2c;
      border-radius: 16px;
      background: #f3f3f3;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${title}</h1>
      <p>Así se verían los dos correos del formulario, con el logo incluido.</p>
    </div>
    <div class="switch">
      <button type="button" data-scheme="light" aria-pressed="true">Claro</button>
      <button type="button" data-scheme="dark" aria-pressed="false">Oscuro</button>
    </div>
  </header>
  <main>${frames}</main>
  <script>
    const frames = document.querySelectorAll("iframe");
    document.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const scheme = button.dataset.scheme;
        document.querySelectorAll("button").forEach((item) => {
          item.setAttribute("aria-pressed", String(item === button));
        });
        frames.forEach((frame) => {
          frame.src = scheme === "dark" ? frame.dataset.dark : frame.dataset.light;
        });
      });
    });
  </script>
</body>
</html>`;
}

const message = {
  name: readArg("--name", sample.name),
  email: readArg("--email", sample.email),
  phone: readArg("--phone", sample.phone),
  story: readArg("--story", sample.story),
};

const server = await createServer({
  root,
  configFile: path.join(root, "vitest.config.mts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});

try {
  const email = await server.ssrLoadModule("/src/lib/contact-email.ts");
  const logo = await readFile(path.join(root, "public", "images", "sin-anonimato-logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const receivedAt = new Date();
  const team = email.teamNotificationEmail(message, receivedAt);
  const client = email.clientConfirmationEmail(message);

  const files = {
    "equipo-claro.html": withLogo(withoutDarkQuery(team.html), logoSrc),
    "equipo-oscuro.html": withLogo(forceDark(team.html), logoSrc),
    "cliente-claro.html": withLogo(withoutDarkQuery(client.html), logoSrc),
    "cliente-oscuro.html": withLogo(forceDark(client.html), logoSrc),
  };

  await mkdir(outDir, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, html]) => writeFile(path.join(outDir, name), html)),
  );
  await writeFile(
    path.join(outDir, "index.html"),
    page("Vista previa del formulario", [
      {
        title: "Para contacto@sinanonimato.cl",
        note: `Asunto: ${team.subject}`,
        light: "equipo-claro.html",
        dark: "equipo-oscuro.html",
      },
      {
        title: `Confirmación para ${message.email}`,
        note: `Asunto: ${client.subject}`,
        light: "cliente-claro.html",
        dark: "cliente-oscuro.html",
      },
    ]),
  );

  console.log(path.join(outDir, "index.html"));
  console.log(`Equipo: ${team.subject}`);
  console.log(`Cliente: ${client.subject}`);
} finally {
  await server.close();
}
