"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  fromDatabaseError,
  fromZodError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
import type { DeliveryResult } from "@/lib/notifications/types";
import type { Database } from "@/lib/supabase/database.types";
import { BUCKETS, isPathInFolder } from "@/lib/uploads/paths";

import type { OrderStatus } from "@/features/orders/status";

import {
  paymentIdSchema,
  recordConfirmedPaymentSchema,
  reviewPaymentSchema,
  type RecordConfirmedPaymentInput,
  type ReviewPaymentInput,
} from "./schemas";

type Payment = Database["public"]["Tables"]["payments"]["Row"];

/** Signed links to proofs last 10 minutes (research R7). */
const PROOF_URL_SECONDS = 10 * 60;

function revalidatePayments(folio: number) {
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  revalidatePath(`/admin/pedidos/${folio}`);
  revalidatePath(`/mi-cuenta/pedidos/${folio}`);
}

/**
 * Confirms or rejects a pending payment and prepares the WhatsApp message for the customer
 * (FR-012, FR-051). The status change happens first; the message never undoes it.
 */
export async function reviewPayment(input: ReviewPaymentInput): Promise<
  ActionResult<{
    payment: Payment;
    orderStatus: OrderStatus;
    notification: DeliveryResult | null;
  }>
> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = reviewPaymentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = auth;
  const { paymentId, decision, reason } = parsed.data;

  const { data: payment, error } = await supabase
    .from("payments")
    .update(
      decision === "confirm"
        ? { status: "confirmed" }
        : { status: "rejected", rejection_reason: reason! },
    )
    .eq("id", paymentId)
    .eq("status", "pending")
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return fail("Este pago ya fue revisado.", { code: "ALREADY_REVIEWED" });
    }
    return fromDatabaseError(error);
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, folio, status, customer:customers(id, full_name, whatsapp, profile_id)",
    )
    .eq("id", payment.order_id)
    .single();
  if (!order) return fail("No encontramos el pedido de este pago.");

  const customer = order.customer!;
  const notifyCustomer = {
    id: customer.id,
    fullName: customer.full_name,
    whatsapp: customer.whatsapp,
    hasAccount: customer.profile_id !== null,
  };
  const notification =
    decision === "confirm"
      ? await notify(supabase, {
          kind: "payment_confirmed",
          customer: notifyCustomer,
          orderId: order.id,
          paymentId: payment.id,
          folio: order.folio,
          amountCents: payment.amount_cents,
        })
      : await notify(supabase, {
          kind: "payment_rejected",
          customer: notifyCustomer,
          orderId: order.id,
          paymentId: payment.id,
          folio: order.folio,
          reason: reason!,
        });

  revalidatePayments(order.folio);
  return ok({ payment, orderStatus: order.status, notification });
}

/** FR-043: a deposit the collector already received; no message is generated (FR-051). */
export async function recordConfirmedPayment(
  input: RecordConfirmedPaymentInput,
): Promise<ActionResult<Payment>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = recordConfirmedPaymentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = auth;

  const { data: order } = await supabase
    .from("orders")
    .select("id, folio, customer_id")
    .eq("folio", parsed.data.folio)
    .maybeSingle();
  if (!order) return fail("No encontramos ese pedido.", { code: "NOT_FOUND" });
  if (parsed.data.proofPath && !isPathInFolder(parsed.data.proofPath, order.customer_id)) {
    return fail("El comprobante no es válido. Vuelve a subirlo.");
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      status: "confirmed",
      amount_cents: parsed.data.amountCents,
      proof_path: parsed.data.proofPath ?? null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return fail("Este pedido ya tiene un pago en revisión o confirmado.");
    }
    return fromDatabaseError(error);
  }

  revalidatePayments(order.folio);
  return ok(data);
}

/** Signed link to see a proof; only the collector can create it (Storage RLS). */
export async function getPaymentProofUrl(
  paymentId: string,
): Promise<ActionResult<{ signedUrl: string; expiresAt: string }>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = paymentIdSchema.safeParse({ paymentId });
  if (!parsed.success) return fromZodError(parsed.error);

  const { data: payment } = await auth.supabase
    .from("payments")
    .select("proof_path")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();
  if (!payment?.proof_path) return fail("Este pago no tiene comprobante.");

  const { data, error } = await auth.supabase.storage
    .from(BUCKETS.paymentProofs)
    .createSignedUrl(payment.proof_path, PROOF_URL_SECONDS);
  if (error || !data) return fail("No tienes permiso para ver este archivo.");

  return ok({
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + PROOF_URL_SECONDS * 1000).toISOString(),
  });
}
