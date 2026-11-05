export type LegalDocument = {
  id: string; title: string; version: string; content: string; privacy: string;
  acceptance: string; digest: string; approved_at: Date | null; retired_at: Date | null;
};
export type Personal = { name: string; email: string; rut?: string; retentionPolicy: string };
export type Authorization = {
  id: string; document_id: string; episode: string; recording_at: Date; personal: string;
  state: "invited" | "pending" | "confirmed" | "cancelled";
  invite_hash: string | null; invite_expires: Date; guest_hash: string | null; guest_expires: Date | null;
  verify_hash: string | null; verify_expires: Date | null; last_verification_at: Date | null;
  accepted_at: Date | null; confirmed_at: Date | null; receipt: string | null; receipt_digest: string | null;
  created_at: Date; retain_until: Date | null; legal_hold: boolean;
};
export type GuestView = {
  id: string; name: string; email: string; episode: string; recordingAt: string;
  state: Authorization["state"]; document: LegalDocument; retentionPolicy: string;
  acceptedAt: string | null; confirmedAt: string | null;
};
export const STATE_LABELS = { invited: "Invitación enviada", pending: "Pendiente de confirmación", confirmed: "Autorización completada", cancelled: "Anulada" };
export const localDate = (value: string | Date) => new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value));
