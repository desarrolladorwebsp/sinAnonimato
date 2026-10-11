"use client";

import { ChatText, EnvelopeSimple, Phone, User, ArrowRight } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { validateContact, type ContactErrors, type ContactMessage } from "@/lib/contact";

const empty: ContactMessage = { name: "", email: "", phone: "", story: "" };

export function StoryForm() {
  const [values, setValues] = useState<ContactMessage>(empty);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"editing" | "sending" | "sent" | "error">("editing");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const sending = useRef(false);

  function update(field: keyof ContactMessage, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setStatus((current) => (current === "error" ? "editing" : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { value, errors: nextErrors } = validateContact(values);
    setErrors(nextErrors);

    if (!value || sending.current) {
      return;
    }

    sending.current = true;
    setStatus("sending");

    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        confirmationSent?: boolean;
        errors?: ContactErrors;
      } | null;

      if (response.status === 400 && data?.errors) {
        setErrors(data.errors);
        setStatus("editing");
        return;
      }

      if (!response.ok || !data?.ok) {
        setStatus("error");
        return;
      }

      setConfirmationSent(data.confirmationSent !== false);
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  return (
    <div className="story-card w-full rounded-2xl p-6 md:p-8">
      <h3 className="text-base font-bold tracking-[0.06em] uppercase md:text-lg">
        Cuéntanos <span className="text-accent">tu historia</span>
      </h3>

      {status === "sent" ? (
        <div className="py-12 text-sm leading-relaxed text-white/80" role="status">
          <p>Gracias, {values.name}. Recibimos tu historia y te responderemos pronto.</p>
          <p className="mt-3">
            {confirmationSent
              ? `Te enviamos una confirmación a ${values.email}.`
              : "No pudimos enviar la confirmación a tu correo, pero tu caso ya llegó a nuestro equipo."}
          </p>
          <button
            className="editorial-link mt-6"
            type="button"
            onClick={() => {
              setValues(empty);
              setErrors({});
              setConfirmationSent(false);
              setStatus("editing");
            }}
          >
            Enviar otro caso
          </button>
        </div>
      ) : (
        <form className="mt-6 flex flex-col gap-3.5" onSubmit={onSubmit} noValidate>
          <Field
            id="nombre"
            label="Nombre completo"
            icon={<User size={16} weight="bold" />}
            value={values.name}
            error={errors.name}
            autoComplete="name"
            onChange={(value) => update("name", value)}
          />
          <Field
            id="correo"
            label="Correo electrónico"
            type="email"
            icon={<EnvelopeSimple size={16} weight="bold" />}
            value={values.email}
            error={errors.email}
            autoComplete="email"
            onChange={(value) => update("email", value)}
          />
          <Field
            id="telefono"
            label="Teléfono (opcional)"
            type="tel"
            icon={<Phone size={16} weight="bold" />}
            value={values.phone}
            error={errors.phone}
            autoComplete="tel"
            onChange={(value) => update("phone", value)}
          />
          <Field
            id="caso"
            label="Cuéntanos brevemente tu caso."
            icon={<ChatText size={16} weight="bold" />}
            value={values.story}
            error={errors.story}
            multiline
            onChange={(value) => update("story", value)}
          />
          {status === "error" ? (
            <p role="alert" className="text-center text-xs leading-relaxed text-accent">
              No pudimos enviar tu caso. Inténtalo de nuevo en unos minutos.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={status === "sending"}
            aria-busy={status === "sending"}
            className="story-submit mt-2 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg px-4 text-sm font-bold tracking-[0.08em] text-white uppercase disabled:opacity-60"
          >
            {status === "sending" ? "Enviando" : "Enviar mi caso"}
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </button>
          <p className="text-center text-xs leading-relaxed text-white/65">
            Tu información será tratada con confidencialidad.
          </p>
        </form>
      )}
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
};

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  multiline = false,
}: FieldProps) {
  const inputClass =
    "w-full bg-transparent text-sm text-white outline-none placeholder:text-[#b5b5b5]";

  return (
    <div>
      <label htmlFor={id} className="form-label mb-2 block text-xs font-medium text-white/80">
        {label}
      </label>
      <div
        className={`form-control flex items-start gap-3 rounded-lg px-4 ${
          error ? "ring-1 ring-accent" : "ring-1 ring-white/10"
        } focus-within:ring-accent`}
      >
        <span className="pt-4 text-white/50" aria-hidden="true">
          {icon}
        </span>
        {multiline ? (
          <textarea
            id={id}
            rows={4}
            value={value}
            placeholder="Cuéntanos qué ocurrió y cómo podemos ayudarte."
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={`${inputClass} min-h-28 resize-y py-3.5 leading-relaxed`}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            placeholder={type === "email" ? "nombre@correo.com" : type === "tel" ? "Tu número de contacto" : "Tu nombre completo"}
            required={type !== "tel"}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={`${inputClass} h-12`}
          />
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 px-1 text-xs text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
