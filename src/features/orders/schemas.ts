import { z } from "zod";

import { text, uuid } from "@/lib/validation/messages";

/**
 * A registered bazaar ({ bazaarId }) or one typed by hand ({ bazaarName }, 2–80 characters).
 * The picker also sends the name of registered bazaars for display; the id wins.
 */
export const orderBazaarSchema = z
  .object({
    bazaarId: uuid.optional(),
    bazaarName: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.bazaarId) return;
    const length = value.bazaarName?.length ?? 0;
    if (length < 2 || length > 80) {
      ctx.addIssue({
        code: "custom",
        path: ["bazaarName"],
        message: "El nombre del bazar debe tener entre 2 y 80 caracteres.",
      });
    }
  })
  .transform((value) =>
    value.bazaarId
      ? { bazaarId: value.bazaarId }
      : { bazaarName: value.bazaarName! },
  );
export type OrderBazaar = z.output<typeof orderBazaarSchema>;

export const orderBazaarsSchema = z
  .array(orderBazaarSchema, { error: "Agrega al menos un bazar." })
  .min(1, "Agrega al menos un bazar.")
  .max(20, "Agrega como máximo 20 bazares.");

export const expectedPackagesSchema = z
  .number({ error: "Escribe cuántos paquetes esperas." })
  .int("Escribe un número entero.")
  .min(1, "Espera al menos 1 paquete.")
  .max(99, "Escribe como máximo 99 paquetes.");

export const folioSchema = z
  .number({ error: "Folio no válido." })
  .int()
  .positive();

const orderFields = {
  bazaars: orderBazaarsSchema,
  description: text(3, 2000),
  expectedPackages: expectedPackagesSchema,
};

/** Customer registers an order; the deposit proof is optional (US1, scenario 3). */
export const createOrderSchema = z.object({
  ...orderFields,
  proofPath: z.string().min(1).optional(),
});
export type CreateOrderInput = z.input<typeof createOrderSchema>;

/** Collector registers an order for any customer (FR-042). */
export const createOrderForCustomerSchema = z.object({
  customerId: uuid,
  ...orderFields,
});
export type CreateOrderForCustomerInput = z.input<
  typeof createOrderForCustomerSchema
>;

export const updateOrderSchema = z.object({
  folio: folioSchema,
  ...orderFields,
});
export type UpdateOrderInput = z.input<typeof updateOrderSchema>;

export const cancelOrderSchema = z.object({
  folio: folioSchema,
  reason: text(3, 500),
});
export type CancelOrderInput = z.input<typeof cancelOrderSchema>;
