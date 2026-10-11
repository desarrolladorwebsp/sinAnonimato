export type ContactMessage = {
  name: string;
  email: string;
  phone: string;
  story: string;
};

export type ContactField = keyof ContactMessage;
export type ContactErrors = Partial<Record<ContactField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown) {
  return typeof value === "string" ? value.replaceAll("\u0000", "").trim() : "";
}

export function validateContact(input: {
  name: unknown;
  email: unknown;
  phone: unknown;
  story: unknown;
}): { value: ContactMessage | null; errors: ContactErrors } {
  const name = text(input.name).replace(/[\r\n]+/g, " ");
  const email = text(input.email);
  const phone = text(input.phone);
  const story = text(input.story);
  const errors: ContactErrors = {};

  if (name.length < 2) {
    errors.name = "Escribe tu nombre.";
  } else if (name.length > 120) {
    errors.name = "El nombre es demasiado largo.";
  }

  if (!emailPattern.test(email)) {
    errors.email = "Escribe un correo válido.";
  } else if (email.length > 254) {
    errors.email = "El correo es demasiado largo.";
  }

  if (phone.length > 40) {
    errors.phone = "El teléfono es demasiado largo.";
  }

  if (story.length < 8) {
    errors.story = "Cuéntanos tu caso.";
  } else if (story.length > 5000) {
    errors.story = "El relato es demasiado largo.";
  }

  if (Object.keys(errors).length > 0) {
    return { value: null, errors };
  }

  return { value: { name, email, phone, story }, errors };
}
