"use server";

import { revalidatePath } from "next/cache";

import { fail, fromDatabaseError, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
import type { DeliveryResult } from "@/lib/notifications/types";
import type { Database } from "@/lib/supabase/database.types";

import type { OrderResult } from "@/features/orders/actions";

import {
  markOrderCompleteSchema,
  markOrderDeliveredSchema,
  registerShipmentSchema,
  type MarkOrderCompleteInput,
  type RegisterShipmentInput,
} from "./schemas";

type Shipment = Database["public"]["Tables"]["shipments"]["Row"];

function revalidateShipping(folio: number) {
  revalidatePath(`/admin/pedidos/${folio}`);
  revalidatePath(`/mi-cuenta/pedidos/${folio}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/envios");
  revalidatePath("/admin");
}

/**
 * FR-020: receiving -> complete. With fewer packages than expected it asks for confirmation
 * first (error INCOMPLETE_PACKAGES with the count).
 */
export async function markOrderComplete(
  input: MarkOrderCompleteInput,
): Promise<ActionResult<OrderResult>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = markOrderCompleteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data: summary } = await auth.supabase
    .from("order_summaries")
    .select("id, received_packages, expected_packages")
    .eq("folio", parsed.data.folio)
    .maybeSingle();
  if (!summary?.id) return fail("No encontramos ese pedido.", { code: "NOT_FOUND" });

  const received = summary.received_packages ?? 0;
  const expected = summary.expected_packages ?? 0;
  if (received < expected && !parsed.data.confirmIncomplete) {
    return fail(`Llegaron ${received} de ${expected} paquetes. ¿Marcar el pedido como completo?`, {
      code: "INCOMPLETE_PACKAGES",
    });
  }

  const { data, error } = await auth.supabase
    .from("orders")
    .update({ status: "complete" })
    .eq("id", summary.id)
    .select("id, folio, status")
    .single();
  if (error) return fromDatabaseError(error);
  revalidateShipping(data.folio);
  return ok(data);
}

/** FR-021, FR-022: registers the shipment (order -> shipped) and prepares the WhatsApp message. */
export async function registerShipment(
  input: RegisterShipmentInput,
): Promise<ActionResult<{ shipment: Shipment; notification: DeliveryResult | null }>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = registerShipmentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;
  const { supabase } = auth;

  const { data: order } = await supabase
    .from("orders")
    .select("id, folio, customer:customers(id, full_name, whatsapp, profile_id)")
    .eq("folio", data.folio)
    .maybeSingle();
  if (!order) return fail("No encontramos ese pedido.", { code: "NOT_FOUND" });

  const carrier = data.type === "carrier" ? data.carrier : null;
  const trackingNumber = data.type === "carrier" ? data.trackingNumber : null;
  const { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      order_id: order.id,
      type: data.type,
      carrier,
      tracking_number: trackingNumber,
      cost_cents: data.costCents,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return fail("Este pedido ya tiene un envío registrado.");
    return fromDatabaseError(error);
  }

  const customer = order.customer!;
  const notification = await notify(supabase, {
    kind: "order_shipped",
    customer: {
      id: customer.id,
      fullName: customer.full_name,
      whatsapp: customer.whatsapp,
      hasAccount: customer.profile_id !== null,
    },
    orderId: order.id,
    shipmentId: shipment.id,
    folio: order.folio,
    type: data.type,
    carrier,
    trackingNumber,
    costCents: data.costCents,
  });

  revalidateShipping(order.folio);
  return ok({ shipment, notification });
}

/** US3, scenario 4: shipped -> delivered (the trigger stamps delivered_at). */
export async function markOrderDelivered(input: {
  folio: number;
}): Promise<ActionResult<OrderResult>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = markOrderDeliveredSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data, error } = await auth.supabase
    .from("orders")
    .update({ status: "delivered" })
    .eq("folio", parsed.data.folio)
    .select("id, folio, status")
    .single();
  if (error) return fromDatabaseError(error);
  revalidateShipping(data.folio);
  return ok(data);
}
