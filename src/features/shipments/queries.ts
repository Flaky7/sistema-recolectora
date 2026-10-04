import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ShipmentType } from "./labels";

export type ShipmentFilters = {
  /** Customer name or code, or tracking number. */
  q?: string;
  type?: ShipmentType;
  /** "en-camino" = shipped, "entregado" = delivered. */
  status?: "shipped" | "delivered";
};

/** Collector's shipment list (US7). */
export async function listShipments({ q, type, status }: ShipmentFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("shipments")
    .select(
      "id, type, carrier, tracking_number, cost_cents, shipped_at, delivered_at, order:orders!inner(id, folio, status, customer:customers!inner(id, code, full_name))",
    )
    .order("shipped_at", { ascending: false })
    .limit(200);

  if (type) query = query.eq("type", type);
  if (status) query = query.eq("order.status", status);

  const term = q?.trim().replace(/[%_,()]/g, " ");
  if (term) {
    const code = term.toUpperCase().replace(/[\s-]/g, "");
    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${term}%,code.eq.${code}`)
      .limit(50);
    const customerIds = (customers ?? []).map((c) => c.id);
    const { data: orders } = customerIds.length
      ? await supabase
          .from("orders")
          .select("id")
          .in("customer_id", customerIds)
          .limit(500)
      : { data: [] as { id: string }[] };
    const orderIds = (orders ?? []).map((o) => o.id);
    query = orderIds.length
      ? query.or(
          `tracking_number.ilike.%${term}%,order_id.in.(${orderIds.join(",")})`,
        )
      : query.ilike("tracking_number", `%${term}%`);
  }

  const { data } = await query;
  return data ?? [];
}
