"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, DownloadSimple, EnvelopeSimple, FileText, LockSimple } from "@phosphor-icons/react";
import type { GuestView } from "@/lib/authorizations/types";
import { localDate } from "@/lib/authorizations/types";
import { AuthorizationShell } from "./shell";
import { useHydrated } from "./use-hydrated";

export async function authorizationApi(path: string, input?: object) {
  const response = await fetch(`/api/authorizations/${path}`, { method: input ? "POST" : "GET", headers: input ? { "Content-Type": "application/json" } : undefined, body: input ? JSON.stringify(input) : undefined, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}
const demonstration: GuestView = {
  id: "demostracion", name: "", email: "invitado@ejemplo.cl", episode: "Una conversación que importa", recordingAt: "2026-12-10T15:00:00Z", state: "invited", acceptedAt: null, confirmedAt: null,
  retentionPolicy: "En el proceso real, aquí se informará la política de conservación aprobada por Sin Anonimato.",
  document: { id: "demo", title: "Autorización de participación", version: "Ejemplo visual", content: "Participación en el podcast\n\nAquí se mostrará el documento de autorización aprobado por el equipo legal de Sin Anonimato.\n\nUso de imagen y voz\n\nEl documento definitivo explicará los usos autorizados, los medios de difusión y el alcance de la participación.\n\nEste contenido es únicamente una demostración de la interfaz y no constituye una autorización legal.", privacy: "Aquí se informará quién es responsable de los datos, para qué se utilizarán, cómo ejercer los derechos y la política de conservación.", acceptance: "He leído y acepto las condiciones de participación y el tratamiento de datos descrito en este documento.", digest: "demo", approved_at: null, retired_at: null },
};
type Phase = "identity" | "document" | "pending" | "confirm" | "complete";

export function GuestFlow({ confirm = false, demo = false }: { confirm?: boolean; demo?: boolean }) {
  const hydrated = useHydrated();
  const [view, setView] = useState<GuestView | null>(demo ? demonstration : null);
  const [phase, setPhase] = useState<Phase>(confirm ? "confirm" : "identity");
  const [name, setName] = useState(""); const [rut, setRut] = useState("");
  const [accepted, setAccepted] = useState(false); const [verification, setVerification] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(!demo);
  const initialized = useRef(false); const flight = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);

  async function refresh() {
    const next: GuestView = await authorizationApi("guest/me");
    setView(next); setName(next.name);
    setPhase(next.state === "confirmed" ? "complete" : next.state === "pending" ? "pending" : "identity");
  }
  useEffect(() => {
    if (initialized.current || demo) return;
    initialized.current = true;
    const fragment = window.location.hash.slice(1);
    if (fragment) window.history.replaceState(null, "", window.location.pathname);
    if (confirm) {
      queueMicrotask(() => {
        setVerification(fragment); setLoading(false);
        if (!fragment) setError("Este enlace no contiene una confirmación. Abre nuevamente el enlace de tu correo o solicita uno nuevo.");
      });
      return;
    }
    void (async () => {
      try { if (fragment) await authorizationApi("guest/exchange", { token: fragment }); await refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo abrir la invitación."); }
      finally { setLoading(false); }
    })();
  // Initialization must consume each single-use link exactly once.
  }, [demo, confirm]);
  useEffect(() => { title.current?.focus(); }, [phase]);

  async function act(work: () => Promise<void>) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la solicitud."); }
    finally { flight.current = false; setBusy(false); }
  }
  function downloadDocument() {
    if (!view) return;
    const value = `${view.document.title}\nVersión ${view.document.version}\n\n${view.document.content}\n\nTratamiento de datos\n${view.document.privacy}\n\n${view.retentionPolicy}\n\nDeclaración de aceptación\n${view.document.acceptance}`;
    const url = URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "documento-de-participacion.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const progress = phase === "identity" ? 1 : phase === "document" ? 2 : 3;
  const heading = (value: string) => <h1 ref={title} tabIndex={-1}>{value}</h1>;
  return <AuthorizationShell demo={demo}>
    <section className="authorization-card" aria-busy={busy || loading}>
      <div className="authorization-private"><LockSimple size={16} aria-hidden="true" /> Acceso privado para invitados</div>
      {!loading && view && phase !== "complete" && phase !== "confirm" && <><ol className="authorization-progress" aria-label="Progreso">{["Tus datos", "Documento", "Confirmación"].map((label, index) => <li key={label} aria-current={progress === index + 1 ? "step" : undefined} className={progress >= index + 1 ? "active" : ""}><span>{index + 1}</span>{label}</li>)}</ol><p className="authorization-episode">{view.episode}</p></>}
      {loading ? <div className="authorization-centered"><p role="status">Abriendo tu invitación privada…</p></div> : <>
        {phase === "identity" && view && <>
          {heading("Antes de encender los micrófonos.")}
          <p className="authorization-lead">Confirma tus datos para preparar la autorización de tu participación.</p>
          <p className="authorization-date">Grabación: <time dateTime={view.recordingAt}>{hydrated ? localDate(view.recordingAt) : "…"}</time></p>
          <form method="post" onSubmit={event => { event.preventDefault(); setError(""); setPhase("document"); }} className="authorization-form">
            <label>Nombre completo<input name="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" placeholder="Tu nombre y apellidos" /></label>
            <label>RUT<input name="rut" value={rut} onChange={event => setRut(event.target.value)} required maxLength={16} placeholder="12.345.678-5" autoComplete="off" spellCheck={false} /></label>
            <label>Correo de la invitación<input value={view.email} type="email" readOnly aria-describedby="email-help" /></label>
            <p id="email-help" className="authorization-help">Enviaremos la verificación a este correo. Si necesitas corregirlo, contacta a producción.</p>
            <button className="authorization-button" type="submit" disabled={!hydrated}>Leer documento <ArrowRight size={20} aria-hidden="true" /></button>
          </form>
        </>}
        {phase === "document" && view && <>
          {heading(view.document.title)}
          <p className="authorization-lead">Lee las condiciones antes de aceptar. Puedes descargar una copia y revisarla con calma.</p>
          <div className="authorization-document-meta"><FileText size={18} aria-hidden="true" /><span>Versión {view.document.version}</span><button type="button" onClick={downloadDocument}>Descargar texto</button></div>
          <article className="authorization-document" tabIndex={0} aria-label="Documento completo de autorización"><div>{view.document.content}</div><h2>Tratamiento de datos personales</h2><div>{view.document.privacy}</div><h2>Conservación de tus datos</h2><div>{view.retentionPolicy}</div></article>
          <form method="post" className="authorization-form" onSubmit={event => { event.preventDefault(); void act(async () => {
            if (!demo) await authorizationApi("guest/accept", { name, rut, accepted, documentDigest: view.document.digest });
            setPhase("pending");
          }); }}>
            <label className="authorization-checkbox"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required /><span>{view.document.acceptance}</span></label>
            <button className="authorization-button" type="submit" disabled={!accepted || busy}>{busy ? "Registrando aceptación…" : "Aceptar y enviar verificación"}<ArrowRight size={20} aria-hidden="true" /></button>
            <button className="authorization-text-button" type="button" disabled={busy} onClick={() => setPhase("identity")}><ArrowLeft size={16} aria-hidden="true" /> Volver a mis datos</button>
          </form>
        </>}
        {phase === "pending" && view && <div className="authorization-centered">
          <EnvelopeSimple className="authorization-feature-icon" size={48} weight="light" aria-hidden="true" />
          {heading("Revisa tu correo.")}
          <p className="authorization-lead">Registramos tu aceptación. Para completarla, abre el enlace de verificación que enviaremos a:</p>
          <strong className="authorization-email">{view.email}</strong><p className="authorization-status">Pendiente de confirmación</p>
          <p className="authorization-help">El enlace dura hasta 30 minutos. Revisa también spam o correo no deseado.</p>
          {demo ? <button className="authorization-button" onClick={() => setPhase("confirm")}>Simular apertura del correo <ArrowRight size={20} /></button> : <button className="authorization-button authorization-button-secondary" disabled={busy} onClick={() => void act(async () => { await authorizationApi("guest/resend", {}); setMessage("Solicitamos un nuevo correo. El enlace anterior dejará de funcionar."); })}>{busy ? "Solicitando…" : "Reenviar correo"}</button>}
        </div>}
        {phase === "confirm" && <div className="authorization-centered">
          <LockSimple className="authorization-feature-icon" size={48} weight="light" aria-hidden="true" />
          {heading("Un último paso, de tu parte.")}
          <p className="authorization-lead">Confirma que tú aceptaste el documento de participación de Sin Anonimato.</p>
          <p className="authorization-help">Si no realizaste esta solicitud, no la confirmes y contacta al equipo.</p>
          <button className="authorization-button" disabled={busy || (!demo && !verification)} onClick={() => void act(async () => {
            if (!demo) { await authorizationApi("guest/confirm", { token: verification }); setVerification(""); await refresh(); }
            else setPhase("complete");
          })}>{busy ? "Confirmando…" : "Confirmar mi autorización"}<ArrowRight size={20} aria-hidden="true" /></button>
          <a className="authorization-text-button" href="/autorizacion">Volver a mi autorización</a>
        </div>}
        {phase === "complete" && <div className="authorization-centered">
          <CheckCircle className="authorization-success-icon" size={64} weight="light" aria-hidden="true" />
          {heading("Todo listo para tu participación.")}
          <p className="authorization-lead">Tu correo está verificado y tu autorización quedó registrada.</p>
          <div className="authorization-receipt"><FileText size={32} aria-hidden="true" /><div><strong>Comprobante de autorización</strong><span>{demo ? "Documento de demostración" : `Folio ${view?.id}`}</span></div></div>
          {demo ? <p className="authorization-help">En el proceso real podrás descargar aquí tu PDF con el documento aceptado y las fechas de aceptación y confirmación.</p> : <a className="authorization-button" href="/api/authorizations/guest/receipt" download><DownloadSimple size={20} aria-hidden="true" /> Descargar comprobante PDF</a>}
          <p className="authorization-help">Enviaremos una copia a tu correo y un aviso al equipo de producción. Conserva el comprobante para tus registros.</p>
          {demo && <button className="authorization-button authorization-button-secondary" onClick={() => { setPhase("identity"); setAccepted(false); }}>Volver a recorrer la demostración</button>}
        </div>}
        {!view && !confirm && !error && <p>Abre el enlace privado enviado por producción para comenzar.</p>}
      </>}
      {error && <p className="authorization-alert" role="alert">{error}</p>}
      {message && <p className="authorization-notice" role="status">{message}</p>}
    </section>
    <p className="authorization-bottom-note">Tu autorización se completa al verificar tu correo. Puedes consultar al equipo antes de aceptar.</p>
  </AuthorizationShell>;
}
