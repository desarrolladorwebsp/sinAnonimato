"use client";

import { ArrowUpRight, X } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";

export function SponsorForm() {
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;

    const fields = new FormData(event.currentTarget);
    const message = {
      kind: "sponsorship",
      name: String(fields.get("name") ?? "").trim(),
      company: String(fields.get("company") ?? "").trim(),
      email: String(fields.get("email") ?? "").trim(),
      story: String(fields.get("story") ?? "").trim(),
    };

    setError("");
    if (message.name.length < 2 || message.company.length < 2 || message.story.length < 8) {
      setError("Escribe tu nombre, el nombre de la marca y una breve descripción de tu idea.");
      return;
    }

    sending.current = true;
    setStatus("sending");

    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        setStatus("idle");
        setError(response.status === 429
          ? "Hay demasiadas solicitudes. Inténtalo de nuevo en unos minutos."
          : "No pudimos enviar tu consulta. Revisa tus datos e inténtalo de nuevo.");
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("No pudimos conectar con el sitio. Inténtalo de nuevo.");
    } finally {
      sending.current = false;
    }
  }

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button className="sponsor-action story-submit" type="button" onClick={() => dialog.current?.showModal()}>
        Quiero auspiciar <ArrowUpRight size={18} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className="info-dialog sponsor-dialog"
        aria-labelledby="sponsor-form-title"
        onClose={() => { if (!sending.current) { setStatus("idle"); setError(""); } }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="info-dialog-content">
          <button className="info-close" type="button" aria-label="Cerrar formulario de auspicio" onClick={close}>
            <X size={22} aria-hidden="true" />
          </button>
          <p className="section-eyebrow">Auspicios</p>
          <h2 id="sponsor-form-title">Conversemos sobre tu marca</h2>
          {status === "sent" ? (
            <div className="mt-5" role="status">
              <p>Recibimos tu consulta de auspicio. Te responderemos al correo que ingresaste.</p>
              <button type="button" className="sponsor-action story-submit mt-4" onClick={close}>Cerrar</button>
            </div>
          ) : (
            <form className="sponsor-form mt-5" method="post" onSubmit={submit} aria-busy={status === "sending"}>
              <label>Nombre<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
              <label>Marca o empresa<input name="company" required minLength={2} maxLength={120} autoComplete="organization" /></label>
              <label className="sponsor-field-wide">Correo de contacto<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
              <label className="sponsor-field-wide">Cuéntanos tu idea<textarea name="story" required minLength={8} maxLength={5000} rows={3} /></label>
              {error && <p className="sponsor-field-wide sponsor-form-error" role="alert">{error}</p>}
              <button type="submit" className="sponsor-field-wide sponsor-action story-submit" disabled={status === "sending"}>
                {status === "sending" ? "Enviando…" : "Enviar consulta"}
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
