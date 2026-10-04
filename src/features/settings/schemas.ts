import { z } from "zod";

import { TEMPLATE_VARIABLES, validateTemplate } from "@/lib/notifications/messages";
import type { NotificationKind } from "@/lib/notifications/types";
import { text } from "@/lib/validation/messages";

function template(kind: NotificationKind) {
  return z
    .string({ error: "Escribe la plantilla." })
    .trim()
    .max(1000, "La plantilla puede tener como máximo 1,000 caracteres.")
    .superRefine((value, ctx) => {
      const check = validateTemplate(kind, value);
      if (check.valid) return;
      ctx.addIssue({
        code: "custom",
        message: check.empty
          ? "La plantilla no puede estar vacía."
          : `Variables no permitidas: ${check.unknown.map((v) => `{${v}}`).join(", ")}. Usa solo: ${TEMPLATE_VARIABLES[kind].map((v) => `{${v}}`).join(", ")}.`,
      });
    });
}

/** FR-040: deposit, payment instructions and WhatsApp templates (only known variables). */
export const updateSettingsSchema = z.object({
  initialDepositCents: z
    .number({ error: "Escribe el monto del pago inicial." })
    .int("Monto no válido.")
    .positive("El monto debe ser mayor a cero."),
  paymentInstructions: text(1, 2000),
  templatePackageReceived: template("package_received"),
  templatePackageUnassigned: template("package_unassigned"),
  templatePaymentConfirmed: template("payment_confirmed"),
  templatePaymentRejected: template("payment_rejected"),
  templateOrderShipped: template("order_shipped"),
});
export type UpdateSettingsInput = z.input<typeof updateSettingsSchema>;

export const TEMPLATE_FIELDS = [
  { name: "templatePackageReceived", kind: "package_received", label: "Paquete recibido" },
  { name: "templatePackageUnassigned", kind: "package_unassigned", label: "Paquete sin pedido" },
  { name: "templatePaymentConfirmed", kind: "payment_confirmed", label: "Pago confirmado" },
  { name: "templatePaymentRejected", kind: "payment_rejected", label: "Pago rechazado" },
  { name: "templateOrderShipped", kind: "order_shipped", label: "Pedido enviado" },
] as const satisfies readonly {
  name: keyof UpdateSettingsInput;
  kind: NotificationKind;
  label: string;
}[];
