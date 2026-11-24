"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, DownloadSimple, EnvelopeSimple, FileText, Plus, YoutubeLogo } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import type { LegalDocument } from "@/lib/authorizations/types";
import { localDate, STATE_LABELS } from "@/lib/authorizations/types";
import { calendarDate, calendarDay, formatRecording } from "@/lib/authorizations/calendar-dates";
import { publicationFormats, type ScheduledEpisode } from "@/lib/episode";
import { CalendarDialog } from "./calendar-dialog";
import { InvitationCalendar } from "./invitation-calendar";
import { AdminReviews } from "./admin-reviews";
import { AdminWorkspace, type AdminSection } from "./admin-workspace";
import { AuthorizationShell } from "./shell";
import { authorizationApi } from "./guest-flow";
import { useHydrated } from "./use-hydrated";

type Row = { id: string; name: string; email: string; rut?: string; episode: string; recordingAt: string; inviteExpires: string; state: keyof typeof STATE_LABELS; acceptedAt: string | null; confirmedAt: string | null; retainUntil: string | null; legalHold: boolean; documentId: string; confirmationMethod?: "email" | "production" | null; confirmedBy?: string | null };
type Job = { authorization_id: string; kind: string; status: string; delivery: string | null; attempts: number };
type Overview = { admin: { email: string; role: "admin" | "production" }; documents: LegalDocument[]; authorizations: Row[]; jobs: Job[]; scheduledEpisodes: ScheduledEpisode[] | null; readiness: { retentionConfigured: boolean; mailConfigured: boolean } };
type Detail = { document: LegalDocument; events: { kind: string; actor: string; happened_at: string; details: Record<string, unknown> }[]; receiptDigest: string | null };
const publicationClock = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const youtubeUrl = (video: ScheduledEpisode) => `https://www.youtube.com/${video.format === "short" ? "shorts/" : "watch?v="}${video.youtubeId}`;
const dialogDayLabel = new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeZone: "UTC" });
const eventLabels: Record<string, string> = { production_confirmed: "Confirmada por producción", production_rejected: "Rechazada por producción", retention_ended: "Conservación finalizada tras revisión", invitation_edited: "Invitación corregida y enlace reemplazado", invited: "Invitación creada", invitation_opened: "Enlace abierto", accepted: "Aceptación expresa registrada", verification_requested: "Verificación solicitada", email_confirmed: "Correo confirmado y PDF generado", invitation_confirmed: "Confirmada desde la invitación y PDF generado", receipt_downloaded: "Comprobante descargado", mail_sent: "Correo aceptado por el proveedor", mail_delivery: "Estado de entrega actualizado", resend: "Correo solicitado por producción", cancel: "Invitación anulada", hold: "Conservación legal bloqueada", release: "Bloqueo de conservación levantado" };

export function AdminPanel() {
  const hydrated = useHydrated();
  const [data, setData] = useState<Overview | null>(null); const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<AdminSection>("calendar");
  const [calendarSelection, setCalendarSelection] = useState(() => calendarDay(new Date()));
  const [dialogDay, setDialogDay] = useState<string | null>(null);
  const [previewInvitationDocument, setPreviewInvitationDocument] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<ScheduledEpisode | null>(null);
  const [episodeDetail, setEpisodeDetail] = useState<ScheduledEpisode | null>(null);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("");
  const [invitationDate, setInvitationDate] = useState<string | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Row | null>(null);
  const [firstInvitationDate, setFirstInvitationDate] = useState(""); const [invitationDocumentId, setInvitationDocumentId] = useState(""); const [documentForm, setDocumentForm] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null); const [detail, setDetail] = useState<Detail | null>(null);
  const [document, setDocument] = useState<LegalDocument | null>(null); const [approved, setApproved] = useState(false);
  const flight = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const episodeHeading = useRef<HTMLHeadingElement>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (detail) detailHeading.current?.focus(); }, [detail]);
  useEffect(() => { if (episodeDetail) episodeHeading.current?.focus(); }, [episodeDetail]);
  async function reload() { setData(await authorizationApi("admin/overview")); }
  useEffect(() => { let active = true; void authorizationApi("admin/overview").then(result => { if (active) setData(result); }).catch(cause => { if (active && cause.status !== 401) setError(cause.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  async function act(work: () => Promise<void>, success?: string) {
    if (flight.current) return; flight.current = true; setBusy(true); setError(""); setMessage("");
    try { await work(); if (success) setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la operación."); }
    finally { flight.current = false; setBusy(false); }
  }
  function openInvite(day?: string, row?: Row) {
    setError("");
    setMessage("");
    setFirstInvitationDate(calendarDay(new Date()));
    setEditingInvitation(row ?? null);
    setInvitationDocumentId(row?.documentId ?? "");
    setInvitationDate(day ?? "");
    setPreviewInvitationDocument(false);
    if (tab === "calendar" && day) setDialogDay(day);
    setScheduleDate(null);
  }
  function openSchedule(day: string, episode?: ScheduledEpisode) {
    setEditingEpisode(episode ?? null);
    setError("");
    setMessage("");
    setFirstInvitationDate(calendarDay(new Date()));
    setInvitationDate(null);
    setScheduleDate(day);
    setDialogDay(day);
  }
  function resetCreationForms() {
    setInvitationDate(null);
    setScheduleDate(null);
    setEditingInvitation(null);
    setEditingEpisode(null);
    setPreviewInvitationDocument(false);
    setError("");
  }
  function showCalendarDay(day: string) {
    setCalendarSelection(day);
    setEpisodeDetail(null);
    setSelected(null);
    setDetail(null);
  }
  function selectCalendarDay(day: string) {
    resetCreationForms();
    showCalendarDay(day);
    setDialogDay(day);
  }
  function closeCreation() {
    resetCreationForms();
    setDialogDay(null);
  }
  function openDetail(row: Row) {
    if (document) setDocument(null);
    setEpisodeDetail(null);
    detailTrigger.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    void act(async () => {
      const result = await authorizationApi(`admin/detail/${row.id}`);
      setSelected(row);
      setDetail(result);
    });
  }
  function closeDetail() {
    setSelected(null);
    setDetail(null);
    detailTrigger.current?.focus();
    detailTrigger.current = null;
  }
  function changeTab(next: typeof tab) {
    if (next === tab) return;
    setTab(next);
    closeCreation();
    setEpisodeDetail(null);
    setSelected(null);
    setDetail(null);
  }
  function decide(row: Row, decision: "confirm" | "reject") {
    const text = decision === "confirm" ? `¿Confirmar la autorización de ${row.name}? El invitado ya registró su aceptación. Se guardará tu validación como producción y se generará el comprobante PDF.` : `¿Rechazar la autorización de ${row.name}? Se invalidarán los enlaces pendientes y se registrará el rechazo sin generar un comprobante de autorización.`;
    if (!window.confirm(text)) return;
    void act(async () => {
      await authorizationApi(`admin/${decision}`, decision === "confirm" ? { id: row.id, approved: true } : { id: row.id, rejected: true });
      setSelected(null); setDetail(null); await reload();
    }, decision === "confirm" ? "Autorización confirmada por producción. PDF generado y envío registrado." : "Autorización rechazada por producción.");
  }
  function submit(event: FormEvent<HTMLFormElement>, action: (values: Record<string, string>) => Promise<void>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    void act(() => action(values));
  }
  const approvedDocument = data?.documents.some(doc => doc.approved_at && !doc.retired_at);
  const canInvite = Boolean(approvedDocument && data?.readiness.retentionConfigured && data?.readiness.mailConfigured);
  const rows = data?.authorizations.filter(row => `${row.name} ${row.email} ${row.episode}`.toLowerCase().includes(search.toLowerCase()) && (!status || row.state === status)) || [];
  const canSchedule = data?.admin.role === "admin" && Array.isArray(data.scheduledEpisodes);
  const selectedInvitationDocument = data?.documents.find(doc => doc.id === invitationDocumentId);
  const invitationForm = data && invitationDate !== null && (<section className="authorization-editor"><h2>{editingInvitation ? "Editar invitación" : "Invitar a una grabación"}</h2><p>{editingInvitation ? "Si cambias los datos, el enlace anterior dejará de funcionar y enviaremos uno nuevo al correo guardado." : "Completa los datos y elige el documento que recibirá el invitado. El enlace vencerá al finalizar el día seleccionado o después de 7 días, lo que ocurra primero."}</p>{!canInvite && <div className="authorization-notice" role="status"><p>Para enviar esta invitación falta: {!approvedDocument ? "publicar un documento aprobado. " : ""}{!data.readiness.retentionConfigured ? "definir el plazo y la política de conservación. " : ""}{!data.readiness.mailConfigured ? "configurar el correo de producción. " : ""}</p>{!approvedDocument && <button type="button" className="authorization-text-button" onClick={() => { changeTab("documents"); setDocument(null); }}>Revisar documentos legales</button>}</div>}<form method="post" className="authorization-form authorization-form-grid" onSubmit={event => submit(event, async values => {
          const result: { alreadyExists?: boolean; updated?: boolean } = await authorizationApi(editingInvitation ? `admin/invite/${editingInvitation.id}` : "admin/invite", values);
          if (tab === "calendar") setCalendarSelection(values.recordingDate);
          setSelected(null);
          setDetail(null);
          closeCreation();
          setMessage(editingInvitation ? (result.updated ? "Invitación actualizada. El nuevo enlace quedó en la cola de envío." : "La invitación ya tenía esos datos.") :
            (result.alreadyExists ? "Ya existe una invitación para ese correo, grabación y documento. Puedes reenviarla desde el expediente." : "Invitación registrada. El correo quedó en la cola de envío."));
          await reload();
        })}><label>Nombre del invitado<input name="name" defaultValue={editingInvitation?.name} autoFocus required minLength={2} maxLength={120} /></label><label>Correo del invitado<input name="email" defaultValue={editingInvitation?.email} required type="email" maxLength={254} /></label><label>Episodio / participación<input name="episode" defaultValue={editingInvitation?.episode} required maxLength={200} /></label><label>Fecha de grabación<input name="recordingDate" required type="date" min={firstInvitationDate} value={invitationDate} onChange={event => setInvitationDate(event.target.value)} /></label><label className="authorization-full">Documento para enviar<select name="documentId" required value={invitationDocumentId} onChange={event => setInvitationDocumentId(event.target.value)}><option value="" disabled>Selecciona el tipo de documento y su versión</option>{data.documents.filter(doc => !doc.retired_at).map(doc => <option key={doc.id} value={doc.id} disabled={!doc.approved_at}>{doc.title} · {doc.version}{!doc.approved_at ? " — Borrador, pendiente de aprobación" : ""}</option>)}</select></label>{invitationDocumentId && <div className="authorization-full"><button type="button" className="authorization-text-button" onClick={() => setPreviewInvitationDocument(current => !current)} aria-expanded={previewInvitationDocument}>{previewInvitationDocument ? "Ocultar documento seleccionado" : "Leer documento seleccionado"}</button>
              {previewInvitationDocument && selectedInvitationDocument && <div className="authorization-document">
                <div>{selectedInvitationDocument.content}</div>
                <h3>Privacidad</h3><div>{selectedInvitationDocument.privacy}</div>
                <h3>Declaración de aceptación</h3><div>{selectedInvitationDocument.acceptance}</div>
              </div>}<p>La autorización conservará esta versión del documento y su huella de integridad.</p></div>}<div className="authorization-actions authorization-full"><button className="authorization-button" disabled={busy || !canInvite || !invitationDocumentId}>{editingInvitation ? "Guardar cambios y reenviar" : "Crear y enviar invitación"}</button><button type="button" className="authorization-text-button" disabled={busy} onClick={dialogDay ? resetCreationForms : closeCreation}>{dialogDay ? "Volver a las opciones" : "Cerrar"}</button></div></form></section>);
  const scheduleForm = data && scheduleDate !== null && (<section className="authorization-editor">
          <h2>{editingEpisode ? "Editar programación" : "Programar video de YouTube"}</h2>
          <p>El video aparecerá en su sección a la hora indicada. Deja el video disponible en YouTube y habilita su reproducción en sitios externos.</p>
          <form className="authorization-form authorization-form-grid" method="post" onSubmit={event => submit(event, async values => {
            const scheduled: ScheduledEpisode = editingEpisode
              ? (await authorizationApi(`admin/episode-schedule/${editingEpisode.youtubeId}`, { ...values, action: "edit" })).video
              : await authorizationApi("admin/episode-schedule", values);
            setCalendarSelection(values.date);
            closeCreation();
            setMessage(`${editingEpisode ? "Programación actualizada" : "Video programado"} para el ${localDate(scheduled.publishAt)} (hora de Chile).`);
            await reload();
          })}>
            <label>Título del video<input name="title" defaultValue={editingEpisode?.title} required maxLength={160} /></label>
            <label>Enlace de YouTube<input name="url" defaultValue={editingEpisode && youtubeUrl(editingEpisode) || undefined} type="url" autoFocus required maxLength={1000} placeholder="https://youtu.be/…" /></label>
            <label className="authorization-full">Formato de video<select name="format" required defaultValue={editingEpisode?.format ?? ""}>
              <option value="" disabled>Selecciona dónde se mostrará</option>
              {Object.entries(publicationFormats).map(([format, label]) => <option key={format} value={format}>{label}</option>)}
            </select></label>
            <label>Fecha de publicación<input name="date" type="date" required min={editingEpisode ? undefined : firstInvitationDate} value={scheduleDate} onChange={event => setScheduleDate(event.target.value)} /></label>
            <label>Hora de publicación (Chile continental)<input name="time" type="time" defaultValue={editingEpisode ? publicationClock.format(new Date(editingEpisode.publishAt)) : undefined} required /></label>
            <div className="authorization-actions authorization-full">
              <button className="authorization-button" disabled={busy}><YoutubeLogo size={18} aria-hidden="true" /> {editingEpisode ? "Guardar cambios del video" : "Guardar programación"}</button>
              <button type="button" className="authorization-text-button" disabled={busy} onClick={resetCreationForms}>Volver a las opciones</button>
            </div>
          </form>
        </section>);

  return <AuthorizationShell admin workspace={Boolean(data)}>
    {loading ? <p role="status">Comprobando acceso…</p> : !data ? <section className="authorization-card authorization-login">
      <EnvelopeSimple size={36} className="authorization-feature-icon" aria-hidden="true" /><h1>El respaldo de cada conversación.</h1>
      <p className="authorization-lead">Ingresa con el correo autorizado y tu contraseña.</p>
      <form method="post" className="authorization-form" onSubmit={event => submit(event, async () => {
        const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password, rememberMe: false });
        if (result.error) throw new Error(result.error.status === 429 ? "Demasiados intentos. Espera cinco minutos antes de volver a ingresar." : "Correo o contraseña incorrectos, o cuenta sin autorización.");
        setPassword(""); await reload();
      })}>
        <label>Correo del equipo<input name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label>Contraseña<input name="password" type="password" autoComplete="current-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        <button className="authorization-button" disabled={busy || !hydrated}>{busy ? "Procesando…" : "Entrar al panel"}<ArrowRight size={20} aria-hidden="true" /></button>
      </form>
    </section> : <AdminWorkspace active={tab} onNavigate={changeTab} admin={data.admin} busy={busy} onRefresh={() => void act(reload)} onSignOut={() => void act(async () => {
      await authClient.signOut();
      setData(null);
      setPassword("");
      setTab("calendar");
      setCalendarSelection(calendarDay(new Date()));
      closeCreation();
      setSelected(null);
      setDetail(null);
      setEpisodeDetail(null);
      setDocument(null);
    })}>
      {tab === "authorizations" && <>
        {!canInvite && <section className="authorization-editor" role="status"><h2>Antes de enviar invitaciones</h2><p>{!approvedDocument ? "Carga y publica el documento legal aprobado. " : ""}{!data.readiness.retentionConfigured ? "Define el plazo y la política de conservación con el equipo responsable. " : ""}{!data.readiness.mailConfigured ? "Completa la configuración del correo de producción. " : ""}Puedes trabajar en el panel mientras preparan estos antecedentes.</p></section>}
        <div className="authorization-metrics"><div><strong>{data.authorizations.filter(row => row.state === "confirmed").length}</strong><span>Confirmadas</span></div><div><strong>{data.authorizations.filter(row => row.state === "pending").length}</strong><span>Por confirmar</span></div><div><strong>{data.authorizations.filter(row => row.state === "invited").length}</strong><span>Invitaciones</span></div></div>
      </>}
      {((!dialogDay && error) || message) && <div className="authorization-admin-feedback">
        {!dialogDay && error && <p className="authorization-alert" role="alert">{error}</p>}
        {message && <p className="authorization-notice" role="status">{message}</p>}
      </div>}
      {tab === "reviews" ? <AdminReviews /> : (tab === "authorizations" || tab === "calendar") ? <>
        {tab === "authorizations" && <div className="authorization-toolbar"><label className="authorization-search"><span className="sr-only">Buscar invitado, correo o episodio</span><input placeholder="Buscar invitado, correo o episodio" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Filtrar por estado" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos los estados</option>{Object.entries(STATE_LABELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><button className="authorization-button" disabled={busy} onClick={() => openInvite()}><Plus size={18} /> Nueva invitación</button></div>}
        {tab === "authorizations" && invitationForm}
        {tab === "calendar" && dialogDay && <CalendarDialog dayLabel={dialogDayLabel.format(calendarDate(dialogDay))} busy={busy} onClose={closeCreation}>
          {error && <p className="authorization-alert" role="alert">{error}</p>}
          {invitationForm || scheduleForm || <div className="authorization-calendar-dialog-options">
            <button type="button" className="authorization-button" onClick={() => openInvite(dialogDay)}><Plus size={18} aria-hidden="true" /> Nueva invitación</button>
            {canSchedule && <button type="button" className="authorization-button authorization-button-secondary" onClick={() => openSchedule(dialogDay)}><YoutubeLogo size={18} aria-hidden="true" /> Programar video de YouTube</button>}
          </div>}
        </CalendarDialog>}
        {tab === "calendar" && data.scheduledEpisodes === null && <p className="authorization-alert" role="status">No se pudo cargar la programación de videos. Usa «Actualizar» para volver a intentarlo.</p>}
        {tab === "calendar" && <InvitationCalendar
          rows={data.authorizations}
          episodes={data.scheduledEpisodes ?? []}
          day={calendarSelection}
          onChangeDay={showCalendarDay}
          onSelectDay={selectCalendarDay}
          onDetail={openDetail}
          onEpisode={episode => { setSelected(null); setDetail(null); setEpisodeDetail(episode); }}
          busy={busy}
        />}
        {tab === "authorizations" && (rows.length ? <div className="authorization-table-wrap"><table className="authorization-table"><caption className="sr-only">Autorizaciones por participante y grabación</caption><thead><tr><th>Invitado</th><th>Participación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td data-label="Invitado"><strong>{row.name}</strong><span>{row.email}</span></td><td data-label="Participación">{row.episode}<span>{formatRecording(row.recordingAt)}</span></td><td data-label="Estado"><span className={`authorization-badge authorization-badge-${row.state}`}>{STATE_LABELS[row.state]}</span>{row.state === "pending" && row.acceptedAt && <span>Aceptación registrada · confirma o rechaza</span>}{row.state === "confirmed" && <span>{row.confirmationMethod === "production" ? "Validada por producción" : row.confirmationMethod === "email" ? "Verificada por correo" : "Confirmada desde la invitación"}</span>}{data.jobs.some(job => job.authorization_id === row.id && (job.status === "failed" || job.delivery === "email.bounced" || job.delivery === "email.failed")) && <span className="authorization-mail-warning">Revisar envío de correo</span>}</td><td data-label="Acciones"><div className="authorization-row-actions">{data.admin.role === "admin" && row.state === "pending" && row.acceptedAt && <button className="authorization-button" disabled={busy} aria-label={`Confirmar autorización de ${row.name}`} onClick={() => decide(row, "confirm")}>Confirmar</button>}{data.admin.role === "admin" && ["invited", "pending"].includes(row.state) && <button className="authorization-button authorization-button-secondary" disabled={busy} aria-label={`Rechazar autorización de ${row.name}`} onClick={() => decide(row, "reject")}>Rechazar</button>}<button disabled={busy} onClick={() => openDetail(row)}>Ver expediente</button>{row.state === "confirmed" && <a href={`/api/authorizations/admin/receipt/${row.id}`} aria-label={`Descargar comprobante de ${row.name}`}><DownloadSimple size={18} /> PDF</a>}</div></td></tr>)}</tbody></table></div> : <div className="authorization-empty"><FileText size={36} /><h2>{data.authorizations.length ? "Sin resultados" : "La primera conversación empieza aquí."}</h2><p>{data.authorizations.length ? "Prueba con otro nombre o estado." : "Publica el documento legal aprobado y crea la primera invitación."}</p></div>)}
      </> : <>
        <div className="authorization-toolbar"><p>Las versiones publicadas conservan su contenido original.</p>{data.admin.role === "admin" && <button className="authorization-button" onClick={() => setDocumentForm(true)}><Plus size={18} /> Nueva versión</button>}</div>
        {documentForm && <section className="authorization-editor"><h2>Preparar una versión del documento</h2><p>Se guardará como borrador. Para habilitar invitaciones deberás revisarlo y confirmar su aprobación.</p><form method="post" className="authorization-form" onSubmit={event => submit(event, async values => { await authorizationApi("admin/document", values); await reload(); setDocumentForm(false); setMessage("Borrador creado. Revisa el contenido antes de publicarlo."); })}><label>Título<input name="title" required maxLength={160} defaultValue="Autorización de participación" /></label><label>Versión<input name="version" required maxLength={50} placeholder="Por ejemplo: 1.0" /></label><label>Condiciones legales completas<textarea name="content" required minLength={50} maxLength={80000} rows={12} /></label><label>Aviso de privacidad<textarea name="privacy" required minLength={50} maxLength={20000} rows={6} /></label><label>Declaración de aceptación<textarea name="acceptance" required minLength={20} maxLength={2000} rows={3} defaultValue="He leído y acepto las condiciones de participación y el tratamiento de datos descrito en este documento." /></label><div className="authorization-actions"><button className="authorization-button" disabled={busy}>Guardar borrador</button><button type="button" className="authorization-text-button" onClick={() => setDocumentForm(false)}>Cerrar</button></div></form></section>}
        {data.documents.length ? <div className="authorization-document-list">{data.documents.map(doc => <button className="authorization-document-item" key={doc.id} onClick={() => { setDocument(doc); setApproved(false); }}><FileText size={26} /><span><strong>{doc.title}</strong><span>Versión {doc.version}</span></span><span>{doc.retired_at ? "Retirado" : doc.approved_at ? "Publicado" : "Borrador"}</span><ArrowRight size={20} /></button>)}</div> : <div className="authorization-empty"><h2>Aún no hay documentos.</h2><p>Incorpora las condiciones y el aviso de privacidad aprobados por tu equipo.</p></div>}
      </>}
      {tab === "calendar" && episodeDetail && <section className="authorization-editor" aria-label="Detalle del video">
        <div className="authorization-toolbar">
          <h2 ref={episodeHeading} tabIndex={-1}>{episodeDetail.title}</h2>
          <button type="button" className="authorization-text-button" onClick={() => setEpisodeDetail(null)}>Cerrar video</button>
        </div>
        <dl className="authorization-detail">
          <dt>Formato</dt><dd>{publicationFormats[episodeDetail.format]}</dd>
          <dt>Publicación en el sitio</dt><dd>{localDate(episodeDetail.publishAt)} (hora de Chile)</dd>
          <dt>Video</dt><dd><a className="authorization-text-button" href={youtubeUrl(episodeDetail)} target="_blank" rel="noreferrer">Abrir enlace en YouTube</a></dd>
        </dl>
        {canSchedule && !episodeDetail.removedAt && <div className="authorization-actions">
          <button type="button" className="authorization-button" disabled={busy} onClick={() => {
            openSchedule(calendarDay(episodeDetail.publishAt), episodeDetail);
            setEpisodeDetail(null);
          }}>Editar video</button>
          <button type="button" className="authorization-button authorization-button-secondary" disabled={busy} onClick={() => {
            if (!window.confirm("¿Retirar este video de Sin Anonimato? Se quitará del sitio y quedará el registro en el calendario.")) return;
            void act(async () => {
              await authorizationApi(`admin/episode-schedule/${episodeDetail.youtubeId}`, { action: "remove" });
              setEpisodeDetail(null);
              setMessage("Video retirado del sitio.");
              await reload();
            });
          }}>Retirar video</button>
        </div>}
      </section>}
      {tab !== "reviews" && selected && detail && <section className="authorization-editor" aria-label="Expediente de autorización"><div className="authorization-toolbar"><h2 ref={detailHeading} tabIndex={-1}>{selected.name}</h2><button className="authorization-text-button" onClick={closeDetail}>Cerrar expediente</button></div><dl className="authorization-detail"><dt>Grabación</dt><dd>{selected.episode} · {formatRecording(selected.recordingAt)}</dd><dt>Estado</dt><dd>{STATE_LABELS[selected.state]}</dd><dt>RUT</dt><dd>{selected.rut || "Aún no informado"}</dd><dt>Documento</dt><dd>{detail.document.title} · {detail.document.version}</dd><dt>Confirmación final</dt><dd>{selected.state === "rejected" ? "Rechazada por producción; consulta el historial" : selected.confirmedAt ? `${localDate(selected.confirmedAt)} · ${selected.confirmationMethod === "production" ? "Producción" : selected.confirmationMethod === "email" ? "Correo del invitado" : "Enlace de invitación"}${selected.confirmedBy ? ` · ${selected.confirmedBy}` : ""}`  : selected.state === "cancelled" ? "Invitación anulada" : selected.acceptedAt ? "Pendiente de confirmación final" : "Aún no hay una aceptación registrada"}</dd><dt>Conservar hasta</dt><dd>{selected.retainUntil ? localDate(selected.retainUntil) : "Plazo indeterminado, sujeto a la finalidad y revisión"}{selected.legalHold ? " · Bloqueo legal activo" : ""}</dd><dt>SHA-256 del comprobante</dt><dd className="authorization-hash">{detail.receiptDigest || "Pendiente de confirmación"}</dd></dl><h3>Historial del expediente</h3><ol className="authorization-timeline">{detail.events.map((event,index) => <li key={index}><strong>{eventLabels[event.kind] || event.kind}</strong><span>{localDate(event.happened_at)} · {event.actor}</span></li>)}</ol><details><summary>Leer el documento vinculado</summary><div className="authorization-document"><div>{detail.document.content}</div><h3>Privacidad</h3><div>{detail.document.privacy}</div><h3>Declaración de aceptación</h3><div>{detail.document.acceptance}</div></div></details><div className="authorization-actions">
        {data.admin.role === "admin" && selected.state === "invited" && !selected.acceptedAt && !selected.legalHold && <button type="button" className="authorization-button" disabled={busy} onClick={() => openInvite(calendarDay(selected.recordingAt), selected)}>Editar invitación</button>}
        {selected.state === "confirmed" && <a className="authorization-button" href={`/api/authorizations/admin/receipt/${selected.id}`}><DownloadSimple size={18} aria-hidden="true" /> Descargar comprobante PDF</a>}
        {data.admin.role === "admin" && selected.state === "pending" && selected.acceptedAt && <button className="authorization-button" disabled={busy} onClick={() => decide(selected, "confirm")}>Confirmar autorización</button>}{data.admin.role === "admin" && ["invited", "pending"].includes(selected.state) && <button className="authorization-button authorization-button-secondary" disabled={busy} onClick={() => decide(selected, "reject")}>Rechazar autorización</button>}
        {selected.state !== "confirmed" && selected.state !== "cancelled" && selected.state !== "rejected" && <button className="authorization-button authorization-button-secondary" disabled={busy} onClick={() => void act(async () => { await authorizationApi("admin/manage", { id: selected.id, action: "resend" }); await reload(); }, "Nuevo correo solicitado.")}>Reenviar enlace</button>}
        {data.admin.role === "admin" && <>{selected.state !== "confirmed" && selected.state !== "cancelled" && selected.state !== "rejected" && <button disabled={busy} className="authorization-text-button" onClick={() => { if (window.confirm("¿Anular esta invitación? El enlace dejará de funcionar.")) void act(async () => { await authorizationApi("admin/manage", { id: selected.id, action: "cancel" }); setSelected(null); await reload(); }, "Invitación anulada."); }}>Anular invitación</button>}<button className="authorization-text-button" disabled={busy} onClick={() => void act(async () => { await authorizationApi("admin/manage", { id: selected.id, action: selected.legalHold ? "release" : "hold" }); setSelected(null); await reload(); }, "Política del expediente actualizada.")}>{selected.legalHold ? "Levantar bloqueo legal" : "Bloquear eliminación por conservación legal"}</button>{!selected.retainUntil && !selected.legalHold && <button type="button" className="authorization-text-button" disabled={busy} onClick={() => { const reason = window.prompt("Indica por qué terminó la finalidad o el fundamento para conservar este expediente (mínimo 20 caracteres). Se invalidarán los enlaces y quedará habilitada su eliminación separada."); if (reason && reason.trim().length >= 20) void act(async () => { await authorizationApi("admin/manage", { id: selected.id, action: "end-retention", reason }); setSelected(null); await reload(); }, "Conservación finalizada. La eliminación requiere una acción adicional."); }}>Finalizar conservación por revisión</button>}{selected.retainUntil && new Date(selected.retainUntil) <= new Date() && !selected.legalHold && <button className="authorization-text-button" disabled={busy} onClick={() => { if (window.confirm("Se eliminarán definitivamente los datos, el comprobante y el historial del expediente. Esta acción no se puede deshacer. ¿Aplicar la eliminación según la política de conservación?")) void act(async () => { await authorizationApi("admin/manage", { id: selected.id, action: "delete" }); setSelected(null); await reload(); }, "Expediente eliminado de la base activa. Los respaldos siguen su ciclo de conservación."); }}>Eliminar expediente vencido</button>}</>}
      </div></section>}
      {tab !== "reviews" && document && <section className="authorization-editor"><div className="authorization-toolbar"><h2>{document.title} · {document.version}</h2><button className="authorization-text-button" onClick={() => setDocument(null)}>Cerrar documento</button></div><div className="authorization-document"><div>{document.content}</div><h3>Privacidad</h3><div>{document.privacy}</div><h3>Declaración de aceptación</h3><div>{document.acceptance}</div></div><p className="authorization-hash">SHA-256: {document.digest}</p>{data.admin.role === "admin" && !document.approved_at && !document.retired_at && <form method="post" className="authorization-form" onSubmit={event => { event.preventDefault(); void act(async () => { await authorizationApi("admin/approve", { id: document.id, approved }); setDocument(null); await reload(); }, "Versión publicada y disponible para nuevas invitaciones."); }}><label className="authorization-checkbox"><input type="checkbox" required checked={approved} onChange={event => setApproved(event.target.checked)} /><span>Confirmo que este documento y su aviso de privacidad fueron revisados y aprobados por el equipo responsable.</span></label><button className="authorization-button" disabled={!approved || busy}>Publicar versión aprobada</button></form>}{data.admin.role === "admin" && document.approved_at && !document.retired_at && <button className="authorization-text-button" disabled={busy} onClick={() => { if (window.confirm("Al retirar esta versión se bloquearán nuevas aceptaciones y confirmaciones pendientes que la utilicen. Las autorizaciones completadas conservarán su evidencia. ¿Retirar versión?")) void act(async () => { await authorizationApi("admin/retire", { id: document.id }); setDocument(null); await reload(); }); }}>Retirar versión de circulación</button>}</section>}
    </AdminWorkspace>}
    {!data && error && <p className="authorization-alert" role="alert">{error}</p>}
  </AuthorizationShell>;
}
