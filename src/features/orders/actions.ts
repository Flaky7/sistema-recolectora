"use server";

import { revalidatePath } from "next/cache";

import { submitPaymentProofSchema } from "@/features/payments/schemas";
import {
  fail,
  fromDatabaseError,
  fromZodError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";
import type { ServerClient } from "@/lib/supabase/server";
import { isPathInFolder } from "@/lib/uploads/paths";

import {
  cancelOrderSchema,
  createOrderForCustomerSchema,
  createOrderSchema,
  updateOrderSchema,
  type CancelOrderInput,
  type CreateOrderForCustomerInput,
  type CreateOrderInput,
  type OrderBazaar,
  type UpdateOrderInput,
} from "./schemas";
import type { OrderStatus } from "./status";

export type OrderResult = { id: string; folio: number; status: OrderStatus };

const PROOF_OUTSIDE_FOLDER = "El comprobante no es válido. Vuelve a subirlo.";

function toRpcBazaars(bazaars: OrderBazaar[]) {
  return bazaars.map((b) =>
    "bazaarId" in b ? { bazaar_id: b.bazaarId } : { bazaar_name: b.bazaarName },
  );
}

async function currentCustomerId(supabase: ServerClient, profileId: string) {
  const { data } = await supabase
    .from("customers")
    .select("id, status")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data;
}

async function orderByFolio(supabase: ServerClient, folio: number) {
  const { data } = await supabase
    .from("orders")
    .select("id, folio, status, customer_id")
    .eq("folio", folio)
    .maybeSingle();
  return data;
}

function revalidateOrder(folio: number) {
  revalidatePath(`/mi-cuenta/pedidos/${folio}`);
  revalidatePath(`/admin/pedidos/${folio}`);
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/pagos");
}

/**
 * Customer registers an order (FR-009, FR-010). With a proof it goes straight to
 * "Pago inicial pendiente"; without one it stays "Registrado" (US1, scenarios 2 and 3).
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<ActionResult<OrderResult & { proofSaved: boolean }>> {
  const auth = await authorize("customer");
  if (!auth.ok) return auth.result;
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, profile } = auth;

  const customer = await currentCustomerId(supabase, profile.id);
  if (!customer) return fail("No encontramos tu cuenta de clienta.");
  if (customer.status !== "active") {
    return fail("Tu cuenta está dada de baja; contacta a la recolectora.", {
      code: "CUSTOMER_INACTIVE",
    });
  }
  const { proofPath } = parsed.data;
  if (proofPath && !isPathInFolder(proofPath, customer.id)) {
    return fail(PROOF_OUTSIDE_FOLDER);
  }

  const { data: order, error } = await supabase.rpc("create_order", {
    customer_id: customer.id,
    description: parsed.data.description,
    expected_packages: parsed.data.expectedPackages,
    bazaars: toRpcBazaars(parsed.data.bazaars),
  });
  if (error || !order) return fromDatabaseError(error ?? { message: "" });

  let status: OrderStatus = order.status;
  let proofSaved = false;
  if (proofPath) {
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({ order_id: order.id, proof_path: proofPath });
    proofSaved = !paymentError;
    if (proofSaved) status = "payment_pending";
  }

  revalidateOrder(order.folio);
  return ok({ id: order.id, folio: order.folio, status, proofSaved });
}

/** FR-042: the collector registers an order for any customer, with or without an account. */
export async function createOrderForCustomer(
  input: CreateOrderForCustomerInput,
): Promise<ActionResult<OrderResult>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = createOrderForCustomerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data: order, error } = await auth.supabase.rpc("create_order", {
    customer_id: parsed.data.customerId,
    description: parsed.data.description,
    expected_packages: parsed.data.expectedPackages,
    bazaars: toRpcBazaars(parsed.data.bazaars),
  });
  if (error || !order) return fromDatabaseError(error ?? { message: "" });

  revalidateOrder(order.folio);
  return ok({ id: order.id, folio: order.folio, status: order.status });
}

/** Customer (while active and before "Completo") or collector edits an order. */
export async function updateOrder(
  input: UpdateOrderInput,
): Promise<ActionResult<OrderResult>> {
  const auth = await authorize("customer", "collector");
  if (!auth.ok) return auth.result;
  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await orderByFolio(auth.supabase, parsed.data.folio);
  if (!existing)
    return fail("No encontramos ese pedido.", { code: "NOT_FOUND" });

  const { data: order, error } = await auth.supabase.rpc("update_order", {
    order_id: existing.id,
    description: parsed.data.description,
    expected_packages: parsed.data.expectedPackages,
    bazaars: toRpcBazaars(parsed.data.bazaars),
  });
  if (error || !order) return fromDatabaseError(error ?? { message: "" });

  revalidateOrder(order.folio);
  return ok({ id: order.id, folio: order.folio, status: order.status });
}

/** A new proof after a rejection, or the first one if the order was saved without it. */
export async function submitPaymentProof(input: {
  folio: number;
  proofPath: string;
}): Promise<ActionResult<OrderResult>> {
  const auth = await authorize("customer");
  if (!auth.ok) return auth.result;
  const parsed = submitPaymentProofSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const order = await orderByFolio(auth.supabase, parsed.data.folio);
  if (!order) return fail("No encontramos ese pedido.", { code: "NOT_FOUND" });
  if (!isPathInFolder(parsed.data.proofPath, order.customer_id)) {
    return fail(PROOF_OUTSIDE_FOLDER);
  }

  const { error } = await auth.supabase
    .from("payments")
    .insert({ order_id: order.id, proof_path: parsed.data.proofPath });
  if (error) {
    if (error.code === "23505") {
      return fail("Este pedido ya tiene un comprobante en revisión.");
    }
    if (error.code === "42501") {
      return fail("Tu cuenta está dada de baja; contacta a la recolectora.");
    }
    return fromDatabaseError(error);
  }

  revalidateOrder(order.folio);
  return ok({ id: order.id, folio: order.folio, status: "payment_pending" });
}

/**
 * The customer cancels while there are no confirmed payments or packages; the collector at
 * any point before shipping. The trigger enforces both rules.
 */
export async function cancelOrder(
  input: CancelOrderInput,
): Promise<ActionResult<OrderResult>> {
  const auth = await authorize("customer", "collector");
  if (!auth.ok) return auth.result;
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await orderByFolio(auth.supabase, parsed.data.folio);
  if (!existing)
    return fail("No encontramos ese pedido.", { code: "NOT_FOUND" });

  const { data: order, error } = await auth.supabase
    .from("orders")
    .update({ status: "cancelled", cancelled_reason: parsed.data.reason })
    .eq("id", existing.id)
    .select("id, folio, status")
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return fail(
        "Este pedido ya no se puede cancelar desde tu cuenta; pide ayuda a la recolectora.",
      );
    }
    return fromDatabaseError(error);
  }

  revalidateOrder(order.folio);
  return ok(order);
}
