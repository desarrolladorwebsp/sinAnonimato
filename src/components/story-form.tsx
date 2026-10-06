"use client";

import { ChatText, EnvelopeSimple, Phone, User, ArrowRight } from "@phosphor-icons/react";
import { useState, type FormEvent, type ReactNode } from "react";

type Fields = {
  name: string;
  email: string;
  phone: string;
  story: string;
};

const empty: Fields = { name: "", email: "", phone: "", story: "" };

function validate(values: Fields) {
  const errors: Partial<Record<keyof Fields, string>> = {};

  if (values.name.trim().length < 2) {
    errors.name = "Escribe tu nombre.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Escribe un correo válido.";
  }

  if (values.story.trim().length < 8) {
    errors.story = "Cuéntanos tu caso.";
  }

  return errors;
}

export function StoryForm() {
  const [values, setValues] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [sent, setSent] = useState(false);

  function update(field: keyof Fields, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setSent(true);
    }
  }

  return (
    <div className="story-card w-full rounded-2xl p-6 md:p-8">
      <h3 className="text-base font-bold tracking-[0.06em] uppercase md:text-lg">
        Cuéntanos <span className="text-accent">tu historia</span>
      </h3>

      {sent ? (
        <div className="py-12 text-sm leading-relaxed text-white/80">
          <p>Gracias por compartir tu historia. El envío de casos estará disponible próximamente.</p>
          <button className="editorial-link mt-6" type="button" onClick={() => setSent(false)}>Editar mi caso</button>
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
          <button
            type="submit"
            className="story-submit mt-2 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg px-4 text-sm font-bold tracking-[0.08em] text-white uppercase"
          >
            Enviar mi caso
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
