import { z } from "zod";
import { es } from "zod/locales";

import { normalizeCustomerCode, CUSTOMER_CODE_PATTERN } from "./customer-code";
import { normalizePhone, PHONE_PATTERN } from "./phone";

// Fallback Spanish messages for any rule without a custom message below.
z.config(es());

/** Required text, trimmed, with a length range and messages in plain Spanish. */
export function text(min: number, max: number) {
  return z
    .string({ error: "Este dato es obligatorio." })
    .trim()
    .min(
      min,
      min <= 1
        ? "Este dato es obligatorio."
        : `Escribe al menos ${min} caracteres.`,
    )
    .max(max, `Escribe como máximo ${max} caracteres.`);
}

/** Optional text: empty input becomes undefined. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Escribe como máximo ${max} caracteres.`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();
}

export const phone = z
  .string({ error: "Escribe el número." })
  .transform(normalizePhone)
  .refine(
    (value) => PHONE_PATTERN.test(value),
    "Escribe un número de 10 dígitos.",
  );

export const customerCode = z
  .string({ error: "Escribe el código." })
  .transform(normalizeCustomerCode)
  .refine(
    (value) => CUSTOMER_CODE_PATTERN.test(value),
    "El código tiene 5 letras o números.",
  );

export const email = z
  .string({ error: "Escribe tu correo." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe un correo válido."));

export const password = z
  .string({ error: "Escribe tu contraseña." })
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña debe tener como máximo 72 caracteres.")
  .refine(
    (value) => /[A-Za-z]/.test(value) && /\d/.test(value),
    "La contraseña debe tener letras y números.",
  );

export const httpsUrl = z
  .string({ error: "Escribe el link." })
  .trim()
  .refine(
    (value) => /^https:\/\/\S+$/.test(value),
    "El link debe empezar con https://",
  );

export const uuid = z.uuid("Identificador no válido.");
