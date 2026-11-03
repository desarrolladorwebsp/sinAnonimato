import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AuthorizationError } from "./config";

function key() {
  const value = process.env.AUTHORIZATION_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new AuthorizationError(503, "Falta configurar el cifrado del módulo.");
  return Buffer.from(value, "hex");
}
export const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export const validToken = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

// Bind encrypted values to their record and purpose to prevent ciphertext substitution.
export function seal(value: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function unseal(value: string, context: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted record");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
