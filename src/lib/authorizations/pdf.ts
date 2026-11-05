import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Authorization, LegalDocument, Personal } from "./types";
import { localDate } from "./types";
import { AuthorizationError } from "./config";

const fontPath = () => path.join(process.cwd(), "src/assets/fonts/montserrat-latin-500-normal.woff");
let fontData: Promise<Buffer> | undefined;
const fontBytes = () => fontData ??= readFile(fontPath());
export async function assertPdfText(...values: string[]) {
  const font = fontkit.create(await fontBytes());
  for (const value of values) for (const char of value) {
    if (!/[\r\n\t]/.test(char) && !font.hasGlyphForCodePoint(char.codePointAt(0)!)) throw new AuthorizationError(400, `El texto contiene un carácter no compatible con el comprobante: ${char}. Reemplázalo antes de continuar.`);
  }
}

export async function makeReceipt(record: Authorization, person: Personal, document: LegalDocument) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Autorización ${record.id}`);
  pdf.setAuthor("Sin Anonimato");
  pdf.setCreationDate(new Date(record.confirmed_at!));
  const regular = await pdf.embedFont(await fontBytes(), { subset: true });
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const safe = (input: string) => input.replaceAll("\t", "    ");
  let page = pdf.addPage([595.28, 841.89]);
  let y = 0;
  function header() {
    page.drawRectangle({ x: 0, y: 771, width: 595.28, height: 71, color: rgb(.04, .04, .04) });
    page.drawText("SIN ANONIMATO", { x: 48, y: 800, size: 18, font: bold, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 48, y: 782, width: 38, height: 3, color: rgb(1, .16, .16) });
    y = 738;
  }
  header();
  function line(value: string, heading = false) {
    const font = heading ? bold : regular;
    const size = heading ? 13 : 10;
    const words = safe(value).split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      // Split long hashes / URLs as well as ordinary words.
      for (const segment of word.match(/.{1,65}/g) || [""]) {
        const candidate = current ? `${current} ${segment}` : segment;
        if (font.widthOfTextAtSize(candidate, size) > 499 && current) { lines.push(current); current = segment; }
        else current = candidate;
      }
    }
    lines.push(current);
    if (heading && y < 110) { page = pdf.addPage([595.28, 841.89]); header(); }
    for (const text of lines) {
      if (y < 64) { page = pdf.addPage([595.28, 841.89]); header(); }
      page.drawText(text, { x: 48, y, size, font, color: rgb(.1, .1, .1) });
      y -= heading ? 21 : 15;
    }
    y -= 7;
  }
  line("COMPROBANTE DE AUTORIZACIÓN", true);
  line(`Folio: ${record.id}`);
  line(`Participante: ${person.name}`);
  line(`RUT: ${person.rut}`);
  line(`${record.confirmation_method === "production" ? "Correo del participante" : "Correo confirmado"}: ${person.email}`);
  line(`Episodio: ${record.episode}`);
  line(`Grabación: ${localDate(record.recording_at)} (America/Santiago)`);
  line(`Aceptación expresa: ${localDate(record.accepted_at!)} (America/Santiago)`);
  line(`${record.confirmation_method === "production" ? "Validación de producción" : "Confirmación por correo"}: ${localDate(record.confirmed_at!)} (America/Santiago)`);
  line(`Tiempos UTC: ${new Date(record.accepted_at!).toISOString()} / ${new Date(record.confirmed_at!).toISOString()}`);
  line(`Documento: ${document.title} - Versión ${document.version}`);
  line(`SHA-256 del documento: ${document.digest}`);
  line("Declaración aceptada", true);
  line(document.acceptance);
  line("Documento aceptado", true);
  for (const paragraph of document.content.split("\n")) line(paragraph);
  line("Tratamiento de datos personales", true);
  for (const paragraph of document.privacy.split("\n")) line(paragraph);
  line("Política de conservación informada", true);
  line(person.retentionPolicy);
  line(record.confirmation_method === "production" ? "Registro electrónico de aceptación expresa del invitado y validación posterior de producción. La validación administrativa no acredita por sí sola la verificación del correo del participante. No corresponde a una firma electrónica avanzada ni acredita por sí solo identidad civil." : "Registro electrónico de aceptación expresa y posterior confirmación por correo. No corresponde a una firma electrónica avanzada ni acredita por sí solo identidad civil.");
  const pages = pdf.getPages();
  pages.forEach((item, index) => item.drawText(`Sin Anonimato | ${record.id} | ${index + 1} / ${pages.length}`, { x: 48, y: 30, size: 8, font: regular, color: rgb(.4, .4, .4) }));
  return Buffer.from(await pdf.save());
}
