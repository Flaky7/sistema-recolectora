import { z } from "zod";

import { optionalText, uuid } from "@/lib/validation/messages";

/** Where the package came from: a registered bazaar, or a name typed by hand. */
const bazaarFields = {
  bazaarId: uuid.optional(),
  bazaarName: z.string().trim().optional(),
};

function requireBazaar(
  value: { bazaarId?: string; bazaarName?: string },
  ctx: z.RefinementCtx,
) {
  if (value.bazaarId) return;
  const length = value.bazaarName?.length ?? 0;
  if (length < 2 || length > 80) {
    ctx.addIssue({
      code: "custom",
      path: ["bazaarName"],
      message: "Indica de qué bazar viene el paquete (2 a 80 caracteres).",
    });
  }
}

/**
 * FR-016, FR-017. Without customer = "sin identificar"; customer without order = "sin pedido".
 * The photo is mandatory: a package is never saved without it (spec, edge cases).
 */
export const registerPackageSchema = z
  .object({
    customerId: uuid.optional(),
    orderId: uuid.optional(),
    ...bazaarFields,
    note: optionalText(500),
    photoPath: z
      .string({ error: "Toma la foto del paquete." })
      .min(1, "Toma la foto del paquete."),
  })
  .superRefine((value, ctx) => {
    requireBazaar(value, ctx);
    if (value.orderId && !value.customerId) {
      ctx.addIssue({
        code: "custom",
        path: ["orderId"],
        message: "Elige primero a la clienta.",
      });
    }
  });
export type RegisterPackageInput = z.input<typeof registerPackageSchema>;

/** Assign an unidentified or order-less package, or move it to another order of the same customer. */
export const assignPackageSchema = z.object({
  packageId: uuid,
  customerId: uuid,
  orderId: uuid.optional(),
});
export type AssignPackageInput = z.input<typeof assignPackageSchema>;
