import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { OrderStatus } from "./status";

const SUMMARY_COLUMNS =
  "id, folio, status, description, expected_packages, received_packages, created_at, updated_at, customer_id, customer_code, customer_name, customer_type, customer_has_account, last_payment_status, last_payment_rejection_reason, shipment_type";

/** The signed-in customer's orders, newest first. RLS returns only hers. */
export async function listMyOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_summaries")
    .select(SUMMARY_COLUMNS)
    .order("folio", { ascending: false });
  return data ?? [];
}

/**
 * Everything the order page shows: summary, bazaars, history, payments, packages and shipment.
 * Returns null when the folio does not exist or belongs to another customer (RLS).
 */
export async function getOrderByFolio(folio: number) {
  if (!Number.isInteger(folio) || folio <= 0) return null;
  const supabase = await createClient();
  const { data: summary } = await supabase
    .from("order_summaries")
    .select("*")
    .eq("folio", folio)
    .maybeSingle();
  if (!summary?.id) return null;
  const orderId = summary.id;

  const [bazaars, history, payments, packages, shipment] = await Promise.all([
    supabase
      .from("order_bazaars")
      .select("id, bazaar_id, bazaar_name")
      .eq("order_id", orderId),
    supabase
      .from("order_status_history")
      .select("id, from_status, to_status, note, created_at")
      .eq("order_id", orderId)
      .order("created_at"),
    supabase
      .from("payments")
      .select(
        "id, amount_cents, status, proof_path, rejection_reason, created_at, reviewed_at, recorded_by",
      )
      .eq("order_id", orderId)
      .order("created_at"),
    supabase
      .from("packages")
      .select("id, bazaar_id, bazaar_name, note, received_at, photo_path")
      .eq("order_id", orderId)
      .order("received_at"),
    supabase.from("shipments").select("*").eq("order_id", orderId).maybeSingle(),
  ]);

  return {
    ...summary,
    id: orderId,
    folio: summary.folio!,
    status: summary.status!,
    bazaars: (bazaars.data ?? []).map((b) => ({
      id: b.id,
      bazaarId: b.bazaar_id,
      name: b.bazaar_name ?? "Bazar",
    })),
    history: history.data ?? [],
    payments: payments.data ?? [],
    packages: (packages.data ?? []).map((p) => ({
      ...p,
      bazaarLabel: p.bazaar_name ?? "Sin bazar",
    })),
    shipment: shipment.data,
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderByFolio>>>;

export type OrderFilters = {
  status?: OrderStatus;
  /** Customer name or code. */
  customer?: string;
  /** Registered bazaar name or free-text bazaar. */
  bazaar?: string;
};

/** Collector's list with filters (FR-039). */
export async function listOrders({ status, customer, bazaar }: OrderFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("order_summaries")
    .select(SUMMARY_COLUMNS)
    .order("folio", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const customerTerm = customer?.trim().replace(/[%_,()]/g, " ");
  if (customerTerm) {
    const code = customerTerm.toUpperCase().replace(/[\s-]/g, "");
    query = query.or(`customer_name.ilike.%${customerTerm}%,customer_code.eq.${code}`);
  }

  const bazaarTerm = bazaar?.trim().replace(/[%_,()]/g, " ");
  if (bazaarTerm) {
    const [{ data: byName }, { data: matchingBazaars }] = await Promise.all([
      supabase.from("order_bazaars").select("order_id").ilike("bazaar_name", `%${bazaarTerm}%`),
      supabase.from("bazaars").select("id").ilike("name", `%${bazaarTerm}%`),
    ]);
    const bazaarIds = (matchingBazaars ?? []).map((b) => b.id);
    const { data: byId } = bazaarIds.length
      ? await supabase.from("order_bazaars").select("order_id").in("bazaar_id", bazaarIds)
      : { data: [] as { order_id: string }[] };
    const orderIds = [...new Set([...(byName ?? []), ...(byId ?? [])].map((r) => r.order_id))];
    if (orderIds.length === 0) return [];
    query = query.in("id", orderIds);
  }

  const { data } = await query;
  return data ?? [];
}

export type OrderSummary = Awaited<ReturnType<typeof listOrders>>[number];
