import { AuthorizationError } from "./config";

export function text(value: unknown, label: string, max = 200, min = 1) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new AuthorizationError(400, `Revisa ${label}.`);
  return value.trim();
}
export function email(value: unknown) {
  const result = text(value, "el correo electrónico", 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result)) throw new AuthorizationError(400, "Escribe un correo electrónico válido.");
  return result;
}
export function rut(value: unknown) {
  const normalized = text(value, "el RUT", 16).replaceAll(".", "").replaceAll("-", "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(normalized)) throw new AuthorizationError(400, "Escribe un RUT válido.");
  const body = normalized.slice(0, -1);
  let sum = 0;
  [...body].reverse().forEach((digit, index) => { sum += Number(digit) * (2 + index % 6); });
  const check = 11 - sum % 11;
  if ((check === 11 ? "0" : check === 10 ? "K" : String(check)) !== normalized.at(-1) || /^0+$/.test(body)) throw new AuthorizationError(400, "El dígito verificador del RUT no coincide.");
  return `${body}-${normalized.at(-1)}`;
}
export function uuid(value: unknown) {
  if (typeof value !== "string" || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)) throw new AuthorizationError(400, "Identificador inválido.");
  return value;
}
