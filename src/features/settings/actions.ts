"use server";

import { revalidatePath } from "next/cache";

import {
  fromDatabaseError,
  fromZodError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";

import { updateSettingsSchema, type UpdateSettingsInput } from "./schemas";

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<ActionResult<{ updatedAt: string }>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const { data, error } = await auth.supabase
    .from("settings")
    .update({
      initial_deposit_cents: v.initialDepositCents,
      payment_instructions: v.paymentInstructions,
      template_package_received: v.templatePackageReceived,
      template_package_unassigned: v.templatePackageUnassigned,
      template_payment_confirmed: v.templatePaymentConfirmed,
      template_payment_rejected: v.templatePaymentRejected,
      template_order_shipped: v.templateOrderShipped,
    })
    .eq("id", 1)
    .select("updated_at")
    .single();
  if (error) return fromDatabaseError(error);
  revalidatePath("/admin/configuracion");
  revalidatePath("/mi-cuenta/pedidos/nuevo");
  return ok({ updatedAt: data.updated_at });
}
