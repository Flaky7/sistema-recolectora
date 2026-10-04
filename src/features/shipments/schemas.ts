import { z } from "zod";

import { folioSchema } from "@/features/orders/schemas";
import { text } from "@/lib/validation/messages";

const costCents = z
  .number({ error: "Escribe el costo del envío." })
  .int("Costo no válido.")
  .min(0, "El costo no puede ser negativo.");

/** FR-021: carrier and tracking number are required only for "Paquetería". */
export const registerShipmentSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      folio: folioSchema,
      type: z.literal("carrier"),
      carrier: text(2, 60),
      trackingNumber: text(3, 60),
      costCents,
    }),
    z.object({
      folio: folioSchema,
      type: z.literal("local_delivery"),
      costCents,
    }),
    z.object({
      folio: folioSchema,
      type: z.literal("local_pickup"),
      costCents,
    }),
  ],
  { error: "Elige el tipo de envío." },
);
export type RegisterShipmentInput = z.input<typeof registerShipmentSchema>;

export const markOrderCompleteSchema = z.object({
  folio: folioSchema,
  /** Required when fewer packages than expected arrived (FR-020). */
  confirmIncomplete: z.boolean().default(false),
});
export type MarkOrderCompleteInput = z.input<typeof markOrderCompleteSchema>;

export const markOrderDeliveredSchema = z.object({ folio: folioSchema });
