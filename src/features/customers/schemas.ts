import { z } from "zod";

import {
  customerCode,
  email,
  password,
  phone,
  text,
  uuid,
} from "@/lib/validation/messages";

export const customerTypeSchema = z.enum(["local", "out_of_town"], {
  error: "Elige si eres local o foránea.",
});

/** Fields shared by every form that edits a customer's contact data (FR-006, FR-008). */
const contactFields = {
  whatsapp: phone,
  shippingAddress: text(10, 500),
  type: customerTypeSchema,
};

/** FR-005. A boolean (not a literal) so forms can start unchecked. */
export const acceptPrivacySchema = z
  .boolean({ error: "Debes aceptar el aviso de privacidad para registrarte." })
  .refine(
    (value) => value,
    "Debes aceptar el aviso de privacidad para registrarte.",
  );

const optionalCustomerCode = z
  .union([z.literal(""), customerCode])
  .optional()
  .transform((value) => value || undefined);

export const signUpCustomerSchema = z.object({
  fullName: text(2, 120),
  ...contactFields,
  email,
  password,
  acceptPrivacy: acceptPrivacySchema,
  /** Only when the WhatsApp belongs to a customer registered by the collector (FR-044). */
  customerCode: optionalCustomerCode,
});
export type SignUpCustomerInput = z.input<typeof signUpCustomerSchema>;

/** Collector registers a customer without an account (FR-041). */
export const createCustomerSchema = z.object({
  fullName: text(2, 120),
  ...contactFields,
});
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;

/** Collector edits any customer; the code never changes (FR-008). */
export const updateCustomerSchema = createCustomerSchema.extend({
  customerId: uuid,
});
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;

/** A customer edits her own WhatsApp, address and type (FR-008). */
export const updateCustomerProfileSchema = z.object(contactFields);
export type UpdateCustomerProfileInput = z.input<
  typeof updateCustomerProfileSchema
>;

export const setCustomerActiveSchema = z.object({
  customerId: uuid,
  active: z.boolean(),
});
export type SetCustomerActiveInput = z.input<typeof setCustomerActiveSchema>;
