import { z } from "zod";

import { folioSchema } from "@/features/orders/schemas";
import { text, uuid } from "@/lib/validation/messages";

export const submitPaymentProofSchema = z.object({
  folio: folioSchema,
  proofPath: z
    .string({ error: "Adjunta el comprobante." })
    .min(1, "Adjunta el comprobante."),
});
export type SubmitPaymentProofInput = z.input<typeof submitPaymentProofSchema>;

/** Confirm or reject a pending payment; rejecting needs a reason the customer will see. */
export const reviewPaymentSchema = z
  .object({
    paymentId: uuid,
    decision: z.enum(["confirm", "reject"]),
    reason: z
      .string()
      .trim()
      .max(500, "Escribe como máximo 500 caracteres.")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "reject" && (value.reason?.length ?? 0) < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Escribe el motivo del rechazo.",
      });
    }
  });
export type ReviewPaymentInput = z.input<typeof reviewPaymentSchema>;

/** Collector records a deposit she already received (FR-043). */
export const recordConfirmedPaymentSchema = z.object({
  folio: folioSchema,
  amountCents: z
    .number({ error: "Escribe el monto." })
    .int("Monto no válido.")
    .positive("El monto debe ser mayor a cero."),
  proofPath: z.string().min(1).optional(),
});
export type RecordConfirmedPaymentInput = z.input<
  typeof recordConfirmedPaymentSchema
>;

export const paymentIdSchema = z.object({ paymentId: uuid });

export const rejectionReason = text(3, 500);
