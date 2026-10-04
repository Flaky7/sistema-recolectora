import { z } from "zod";

import { acceptPrivacySchema } from "@/features/customers/schemas";
import { email, httpsUrl, password, phone, text, uuid } from "@/lib/validation/messages";

export const BAZAAR_DOCUMENT_TYPES = [
  "id_card",
  "selfie",
  "proof_of_address",
  "registration_payment",
] as const;

export const signUpBazaarSchema = z.object({
  email,
  password,
  acceptPrivacy: acceptPrivacySchema,
});
export type SignUpBazaarInput = z.input<typeof signUpBazaarSchema>;

export const brandsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Una marca no puede estar vacía.")
      .max(40, "Cada marca puede tener como máximo 40 caracteres."),
    { error: "Agrega al menos una marca." },
  )
  .min(1, "Agrega al menos una marca.")
  .max(30, "Agrega como máximo 30 marcas.");

/** Public profile proposed by the bazaar: published only when the collector authorizes it. */
export const bazaarProposalSchema = z.object({
  name: text(2, 80),
  brands: brandsSchema,
  linkUrl: httpsUrl,
  /** 0 to 3 photos; optional (FR-024). The order is the order shown in the directory. */
  photoPaths: z
    .array(z.string().min(1))
    .max(3, "Puedes subir como máximo 3 fotos.")
    .default([]),
});
export type BazaarProposalInput = z.input<typeof bazaarProposalSchema>;

/** Every photo must live in the bazaar's own folder ("{bazaar_id}/…", contracts/storage.md). */
export function photosBelongTo(paths: readonly string[], bazaarId: string): boolean {
  return paths.every((path) =>
    new RegExp(`^${bazaarId}/[A-Za-z0-9_-]+\\.(jpg|png|webp)$`).test(path),
  );
}

export const bazaarDocumentSchema = z.object({
  type: z.enum(BAZAAR_DOCUMENT_TYPES, { error: "Tipo de documento no válido." }),
  documentPath: z.string({ error: "Sube el documento." }).min(1, "Sube el documento."),
});
export type BazaarDocumentInput = z.input<typeof bazaarDocumentSchema>;

export const bazaarReferenceSchema = z.object({
  fullName: text(2, 120),
  phone,
});

/** Exactly 3 references (FR-024). */
export const bazaarReferencesSchema = z.object({
  references: z
    .array(bazaarReferenceSchema)
    .length(3, "Escribe exactamente 3 referencias."),
});
export type BazaarReferencesInput = z.input<typeof bazaarReferencesSchema>;

export const reviewDecisionReason = z
  .string()
  .trim()
  .max(500, "Escribe como máximo 500 caracteres.")
  .optional();

/** Reject and suspend need a reason the bazaar will see (FR-027). */
export const reviewBazaarSchema = z
  .object({
    bazaarId: uuid,
    decision: z.enum(["approve", "reject", "suspend", "reactivate"]),
    reason: reviewDecisionReason,
  })
  .superRefine((value, ctx) => {
    if ((value.decision === "reject" || value.decision === "suspend") && (value.reason?.length ?? 0) < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Escribe el motivo." });
    }
  });
export type ReviewBazaarInput = z.input<typeof reviewBazaarSchema>;

export const reviewItemSchema = z
  .object({
    id: uuid,
    decision: z.enum(["approve", "reject"]),
    reason: reviewDecisionReason,
  })
  .superRefine((value, ctx) => {
    if (value.decision === "reject" && (value.reason?.length ?? 0) < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Escribe el motivo del rechazo." });
    }
  });
export type ReviewItemInput = z.input<typeof reviewItemSchema>;
