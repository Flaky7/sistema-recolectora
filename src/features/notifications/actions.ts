"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";
import { redeliver } from "@/lib/notifications";
import type { DeliveryResult } from "@/lib/notifications/types";
import { uuid } from "@/lib/validation/messages";

/** Opens WhatsApp again with a message already sent (e.g. the collector closed it by mistake). */
export async function resendNotification(
  notificationId: string,
): Promise<ActionResult<DeliveryResult>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = uuid.safeParse(notificationId);
  if (!parsed.success) return fail("Aviso no válido.");

  const { data } = await auth.supabase
    .from("notifications")
    .select("kind, body, customer:customers(whatsapp)")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!data) return fail("No encontramos ese aviso.", { code: "NOT_FOUND" });
  const phone = data.customer?.whatsapp;
  if (!phone) return fail("La clienta ya no tiene WhatsApp registrado.");

  return ok(await redeliver(data.kind, phone, data.body));
}
