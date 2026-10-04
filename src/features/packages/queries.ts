import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PackageFilter = "all" | "no_order" | "unidentified";

const COLUMNS =
  "id, received_at, note, bazaar_name, photo_path, customer_id, order_id, customer:customers(id, code, full_name), order:orders(id, folio, status)";

/** Collector's package list (US2, US7): all, "sin pedido" or "sin identificar". */
export async function listPackages({
  filter = "all",
  q,
}: { filter?: PackageFilter; q?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("packages")
    .select(COLUMNS)
    .order("received_at", { ascending: false })
    .limit(200);

  if (filter === "no_order") query = query.not("customer_id", "is", null).is("order_id", null);
  if (filter === "unidentified") query = query.is("customer_id", null);

  const term = q?.trim().replace(/[%_,()]/g, " ");
  if (term) {
    const code = term.toUpperCase().replace(/[\s-]/g, "");
    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${term}%,code.eq.${code}`)
      .limit(50);
    const ids = (customers ?? []).map((c) => c.id);
    query = ids.length
      ? query.or(`bazaar_name.ilike.%${term}%,note.ilike.%${term}%,customer_id.in.(${ids.join(",")})`)
      : query.or(`bazaar_name.ilike.%${term}%,note.ilike.%${term}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export type PackageListItem = Awaited<ReturnType<typeof listPackages>>[number];

/** Packages of one order, oldest first (order pages of the customer and the collector). */
export async function listPackagesByOrder(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("packages")
    .select("id, received_at, note, bazaar_name, photo_path")
    .eq("order_id", orderId)
    .order("received_at");
  return data ?? [];
}

/** Notifications already generated for an order, newest first (to resend them). */
export async function listOrderNotifications(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, created_at, package_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
