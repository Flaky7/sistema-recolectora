import type { Database } from "@/lib/supabase/database.types";

export type BazaarStatus = Database["public"]["Enums"]["bazaar_status"];
export type ProposalStatus = Database["public"]["Enums"]["proposal_status"];
export type DocumentStatus = Database["public"]["Enums"]["document_status"];
export type BazaarDocumentType =
  Database["public"]["Enums"]["bazaar_document_type"];

export const BAZAAR_STATUS_LABELS: Record<BazaarStatus, string> = {
  draft: "Registro incompleto",
  pending_review: "Pendiente de revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  suspended: "Suspendido",
  deleted: "Eliminado",
};

/** What each status means for the bazaar (US4, scenario 3). */
export const BAZAAR_STATUS_HINTS: Record<BazaarStatus, string> = {
  draft:
    "Completa tu ficha y envíala a revisión. Mientras tanto nadie más la ve.",
  pending_review:
    "La recolectora está revisando tu registro. Te avisaremos cuando lo apruebe.",
  approved: "Tu bazar aparece en el directorio.",
  rejected:
    "Corrige lo que se indica en el motivo y vuelve a enviar tu registro.",
  suspended:
    "Tu bazar está dado de baja temporalmente y no aparece en el directorio. Contacta a la recolectora.",
  deleted: "Este bazar fue eliminado.",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Borrador",
  pending: "Cambio en revisión",
  approved: "Autorizado",
  rejected: "Rechazado",
  discarded: "Descartado",
};

export const DOCUMENT_TYPE_LABELS: Record<BazaarDocumentType, string> = {
  id_card: "Credencial",
  selfie: "Foto de la persona",
  proof_of_address: "Comprobante de domicilio",
  registration_payment: "Comprobante de pago de registro",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "En revisión",
  current: "Vigente",
  rejected: "Rechazado",
};
