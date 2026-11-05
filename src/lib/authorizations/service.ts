import { randomUUID } from "node:crypto";
import type { Connection, Database } from "./db";
import { AuthorizationError, settings } from "./config";
import { digest, seal, token, unseal, validToken } from "./crypto";
import * as validate from "./validation";
import type { Authorization, GuestView, LegalDocument, Personal } from "./types";
import { assertPdfText, makeReceipt } from "./pdf";

function fail(message = "El enlace venció, fue reemplazado o ya no está disponible."): never { throw new AuthorizationError(410, message); }
export const personOf = (row: Pick<Authorization, "personal" | "id">): Personal => JSON.parse(unseal(row.personal, `personal:${row.id}`));
const encryptedPerson = (id: string, person: Personal) => seal(JSON.stringify(person), `personal:${id}`);
const date = (value: Date | string) => new Date(value);

export async function event(db: Connection, id: string, kind: string, actor: string, details = {}) {
  await db.query("INSERT INTO sa_events(id,authorization_id,kind,actor,details) VALUES($1,$2,$3,$4,$5)", [randomUUID(), id, kind, actor, JSON.stringify(details)]);
}
async function enqueue(db: Connection, row: Authorization, kind: string, payload: object, expires?: Date) {
  const id = randomUUID();
  await db.query("INSERT INTO sa_outbox(id,authorization_id,kind,payload,expires_at) VALUES($1,$2,$3,$4,$5)", [id, row.id, kind, seal(JSON.stringify(payload), `mail:${id}`), expires || null]);
}
async function documentOf(db: Connection, id: string) {
  const { rows } = await db.query<LegalDocument>("SELECT * FROM sa_documents WHERE id=$1", [id]);
  if (!rows[0]) fail();
  return rows[0];
}
async function active(row: Authorization | undefined): Promise<Authorization> {
  if (!row || row.state === "cancelled" || date(row.retain_until) <= new Date()) fail();
  return row;
}

export class Authorizations {
  constructor(public db: Database) {}

  async createDocument(input: Record<string, unknown>, actor: string) {
    const title = validate.text(input.title, "el título", 160);
    const version = validate.text(input.version, "la versión", 50);
    const content = validate.text(input.content, "el documento", 80000, 50);
    const privacy = validate.text(input.privacy, "el aviso de privacidad", 20000, 50);
    const acceptance = validate.text(input.acceptance, "la declaración de aceptación", 2000, 20);
    await assertPdfText(title, version, content, privacy, acceptance);
    const id = randomUUID();
    await this.db.query("INSERT INTO sa_documents(id,title,version,content,privacy,acceptance,digest) VALUES($1,$2,$3,$4,$5,$6,$7)", [id,title,version,content,privacy,acceptance,digest(JSON.stringify({ title, version, content, privacy, acceptance }))]);
    return { id, actor };
  }
  async approveDocument(id: string, actor: string, approved: unknown) {
    if (approved !== true) throw new AuthorizationError(400, "Debes confirmar la aprobación del documento y su aviso de privacidad.");
    const result = await this.db.query("UPDATE sa_documents SET approved_at=now(),approved_by=$2 WHERE id=$1 AND approved_at IS NULL AND retired_at IS NULL RETURNING id", [validate.uuid(id), actor]);
    if (!result.rows.length) throw new AuthorizationError(409, "El documento ya fue publicado o retirado.");
  }
  async retireDocument(id: string) {
    await this.db.query("UPDATE sa_documents SET retired_at=now() WHERE id=$1", [validate.uuid(id)]);
  }
  async invite(input: Record<string, unknown>, actor: string) {
    const config = settings();
    if (!process.env.PRODUCTION_EMAIL) throw new AuthorizationError(503, "Falta configurar el correo de producción.");
    validate.email(process.env.PRODUCTION_EMAIL);
    const personal: Personal = { name: validate.text(input.name, "el nombre", 120, 2), email: validate.email(input.email), retentionPolicy: config.retentionPolicy };
    const episode = validate.text(input.episode, "el episodio", 200);
    await assertPdfText(personal.name, personal.email, personal.retentionPolicy, episode);
    const recording = new Date(validate.text(input.recordingAt, "la fecha de grabación", 50));
    if (Number.isNaN(recording.getTime()) || recording <= new Date()) throw new AuthorizationError(400, "Selecciona una fecha de grabación futura.");
    return this.db.transaction(async db => {
      const document = await documentOf(db, validate.uuid(input.documentId));
      if (!document.approved_at || document.retired_at) throw new AuthorizationError(409, "Selecciona un documento aprobado y vigente.");
      const id = randomUUID();
      const invitation = token();
      const expires = new Date(Math.min(Date.now() + 7 * 86400000, recording.getTime()));
      const retainUntil = new Date(recording.getTime() + config.retention * 86400000);
      const { rows } = await db.query<Authorization>("INSERT INTO sa_authorizations(id,document_id,episode,recording_at,personal,invite_hash,invite_expires,created_by,retain_until) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *", [id, document.id, episode, recording, encryptedPerson(id, personal), digest(invitation), expires, actor, retainUntil]);
      await enqueue(db, rows[0], "invitation", { to: personal.email, name: personal.name, episode, url: `${config.origin}/autorizacion#${invitation}` }, expires);
      await event(db, id, "invited", actor, { documentId: document.id, documentDigest: document.digest });
      return { id };
    });
  }
  async exchange(invitation: unknown) {
    if (!validToken(invitation)) fail();
    return this.db.transaction(async db => {
      const result = await db.query<Authorization>("SELECT * FROM sa_authorizations WHERE invite_hash=$1 FOR UPDATE", [digest(invitation)]);
      const row = await active(result.rows[0]);
      if (date(row.invite_expires) <= new Date()) fail();
      const session = token();
      await db.query("UPDATE sa_authorizations SET invite_hash=NULL,guest_hash=$2,guest_expires=$3 WHERE id=$1", [row.id, digest(session), row.invite_expires]);
      await event(db, row.id, "invitation_opened", "guest");
      return { session, expires: row.invite_expires };
    });
  }
  async guestRow(session: unknown, db: Connection = this.db, lock = false) {
    if (!validToken(session)) throw new AuthorizationError(401, "Abre el enlace privado de tu invitación para continuar.");
    const { rows } = await db.query<Authorization>(`SELECT * FROM sa_authorizations WHERE guest_hash=$1${lock ? " FOR UPDATE" : ""}`, [digest(session)]);
    const row = await active(rows[0]);
    if (!row.guest_expires || date(row.guest_expires) <= new Date()) fail();
    return row;
  }
  async view(session: unknown): Promise<GuestView> {
    const row = await this.guestRow(session);
    const person = personOf(row);
    const legal = await documentOf(this.db, row.document_id);
    // Explicit projection keeps internal approver emails and metadata out of guest responses.
    const document = { id: legal.id, title: legal.title, version: legal.version, content: legal.content, privacy: legal.privacy, acceptance: legal.acceptance, digest: legal.digest, approved_at: legal.approved_at, retired_at: legal.retired_at };
    return { id: row.id, name: person.name, email: person.email, episode: row.episode, recordingAt: date(row.recording_at).toISOString(), state: row.state, document, retentionPolicy: person.retentionPolicy, acceptedAt: row.accepted_at ? date(row.accepted_at).toISOString() : null, confirmedAt: row.confirmed_at ? date(row.confirmed_at).toISOString() : null };
  }
  async verification(db: Connection, row: Authorization, personal: Personal) {
    const verification = token();
    const expires = new Date(Math.min(Date.now() + 30 * 60000, date(row.invite_expires).getTime()));
    if (expires <= new Date()) fail();
    await db.query("UPDATE sa_authorizations SET verify_hash=$2,verify_expires=$3,last_verification_at=now() WHERE id=$1", [row.id, digest(verification), expires]);
    await db.query("UPDATE sa_outbox SET status='cancelled',payload='' WHERE authorization_id=$1 AND kind='verification' AND status IN ('queued','failed')", [row.id]);
    await enqueue(db, row, "verification", { to: personal.email, name: personal.name, episode: row.episode, url: `${settings().origin}/autorizacion/confirmar#${verification}` }, expires);
    await event(db, row.id, "verification_requested", "guest");
  }
  async accept(session: unknown, input: Record<string, unknown>) {
    return this.db.transaction(async db => {
      const row = await this.guestRow(session, db, true);
      if (date(row.invite_expires) <= new Date()) fail();
      if (row.state !== "invited") throw new AuthorizationError(409, "La aceptación ya está registrada. Revisa tu correo para confirmarla.");
      const document = await documentOf(db, row.document_id);
      if (!document.approved_at || document.retired_at) throw new AuthorizationError(409, "El documento fue retirado. Solicita una nueva invitación a producción.");
      if (input.accepted !== true || input.documentDigest !== document.digest) throw new AuthorizationError(400, "Debes leer y aceptar expresamente la versión del documento presentada.");
      const person = personOf(row);
      person.name = validate.text(input.name, "el nombre completo", 120, 2);
      await assertPdfText(person.name);
      person.rut = validate.rut(input.rut);
      // The verification destination is fixed by production, never by untrusted guest input.
      await db.query("UPDATE sa_authorizations SET personal=$2,state='pending',accepted_at=now() WHERE id=$1", [row.id, encryptedPerson(row.id, person)]);
      await event(db, row.id, "accepted", "guest", { documentDigest: document.digest, version: document.version, explicitAcceptance: true });
      await this.verification(db, row, person);
    });
  }
  async resend(session: unknown) {
    return this.db.transaction(async db => {
      const row = await this.guestRow(session, db, true);
      if (row.state !== "pending") throw new AuthorizationError(409, "Esta autorización no está pendiente de confirmación.");
      if (row.last_verification_at && Date.now() - date(row.last_verification_at).getTime() < 60000) throw new AuthorizationError(429, "Espera un minuto antes de reenviar el correo.");
      await this.verification(db, row, personOf(row));
    });
  }
  async confirm(verification: unknown) {
    if (!validToken(verification)) fail();
    return this.db.transaction(async db => {
      const { rows } = await db.query<Authorization>("SELECT * FROM sa_authorizations WHERE verify_hash=$1 FOR UPDATE", [digest(verification)]);
      const row = await active(rows[0]);
      if (row.state !== "pending" || !row.verify_expires || date(row.verify_expires) <= new Date()) fail();
      const document = await documentOf(db, row.document_id);
      if (document.retired_at) throw new AuthorizationError(409, "El documento fue retirado. Contacta a producción.");
      const now = new Date();
      row.confirmed_at = now;
      const person = personOf(row);
      const receipt = await makeReceipt(row, person, document);
      const session = token();
      const sessionExpires = new Date(Math.min(Date.now() + 7 * 86400000, date(row.retain_until).getTime()));
      await db.query("UPDATE sa_authorizations SET state='confirmed',confirmed_at=$2,verify_hash=NULL,verify_expires=NULL,invite_hash=NULL,guest_hash=$3,guest_expires=$4,receipt=$5,receipt_digest=$6 WHERE id=$1", [row.id,now,digest(session),sessionExpires,seal(receipt.toString("base64"), `receipt:${row.id}`),digest(receipt)]);
      await event(db, row.id, "email_confirmed", "guest", { receiptDigest: digest(receipt) });
      await enqueue(db, row, "guest_receipt", { to: person.email, name: person.name, episode: row.episode });
      await enqueue(db, row, "production", { to: validate.email(process.env.PRODUCTION_EMAIL), name: person.name, episode: row.episode, url: `${settings().origin}/admin/autorizaciones` });
      return { session, expires: sessionExpires, id: row.id };
    });
  }
  async receipt(row: Authorization, actor: string) {
    if (row.state !== "confirmed" || !row.receipt) throw new AuthorizationError(409, "El comprobante estará disponible después de confirmar el correo.");
    const pdf = Buffer.from(unseal(row.receipt, `receipt:${row.id}`), "base64");
    if (digest(pdf) !== row.receipt_digest) throw new AuthorizationError(500, "No se pudo verificar la integridad del comprobante.");
    await event(this.db, row.id, "receipt_downloaded", actor);
    return pdf;
  }
  async list(search = "") {
    const { rows } = await this.db.query<Pick<Authorization, "id" | "personal" | "episode" | "recording_at" | "state" | "created_at" | "accepted_at" | "confirmed_at" | "retain_until" | "legal_hold" | "document_id">>("SELECT id,personal,episode,recording_at,state,created_at,accepted_at,confirmed_at,retain_until,legal_hold,document_id FROM sa_authorizations ORDER BY created_at DESC");
    return rows.map(row => ({ id: row.id, ...personOf(row), episode: row.episode, recordingAt: row.recording_at, state: row.state, createdAt: row.created_at, acceptedAt: row.accepted_at, confirmedAt: row.confirmed_at, retainUntil: row.retain_until, legalHold: row.legal_hold, documentId: row.document_id })).filter(row => `${row.name} ${row.email} ${row.episode}`.toLowerCase().includes(search.toLowerCase()));
  }
  async adminRow(id: string) {
    const { rows } = await this.db.query<Authorization>("SELECT * FROM sa_authorizations WHERE id=$1", [validate.uuid(id)]);
    if (!rows[0]) throw new AuthorizationError(404, "No se encontró la autorización.");
    return rows[0];
  }
  async manage(id: string, action: unknown, actor: string) {
    return this.db.transaction(async db => {
      const { rows } = await db.query<Authorization>("SELECT * FROM sa_authorizations WHERE id=$1 FOR UPDATE", [validate.uuid(id)]);
      const row = rows[0];
      if (!row) throw new AuthorizationError(404, "No se encontró la autorización.");
      if (action === "delete") {
        if (row.legal_hold || date(row.retain_until) > new Date()) throw new AuthorizationError(409, "El expediente tiene conservación vigente o bloqueo legal. Revisa la política antes de eliminarlo.");
        await db.query("DELETE FROM sa_authorizations WHERE id=$1", [id]);
        return;
      }
      if (action === "hold" || action === "release") {
        await db.query("UPDATE sa_authorizations SET legal_hold=$2 WHERE id=$1", [id, action === "hold"]);
      } else if (action === "cancel") {
        if (row.state === "confirmed") throw new AuthorizationError(409, "Una autorización confirmada debe conservar su evidencia. Gestiona el retiro con el responsable legal.");
        await db.query("UPDATE sa_authorizations SET state='cancelled',invite_hash=NULL,guest_hash=NULL,verify_hash=NULL WHERE id=$1", [id]);
        await db.query("UPDATE sa_outbox SET status='cancelled',payload='' WHERE authorization_id=$1 AND status IN ('queued','failed')", [id]);
      } else if (action === "resend") {
        await active(row);
        if (row.state === "pending") { await this.verification(db, row, personOf(row)); }
        else if (row.state === "invited") {
          if (date(row.recording_at) <= new Date()) fail("La fecha de grabación ya pasó. Crea una nueva invitación.");
          const invitation = token();
          const expires = new Date(Math.min(Date.now() + 7 * 86400000, date(row.recording_at).getTime()));
          await db.query("UPDATE sa_authorizations SET invite_hash=$2,invite_expires=$3,guest_hash=NULL WHERE id=$1", [id,digest(invitation),expires]);
          await db.query("UPDATE sa_outbox SET status='cancelled',payload='' WHERE authorization_id=$1 AND kind='invitation' AND status IN ('queued','failed')", [id]);
          const personal = personOf(row);
          await enqueue(db,row,"invitation",{ to: personal.email, name: personal.name, episode: row.episode, url: `${settings().origin}/autorizacion#${invitation}` },expires);
        } else throw new AuthorizationError(409, "La autorización ya está completada.");
      } else throw new AuthorizationError(400, "Acción inválida.");
      await event(db,id,String(action),actor);
    });
  }
}
