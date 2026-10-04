import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Pending work shown on the collector's dashboard (FR-038, US7 scenario 1). */
export async function getDashboardCounts() {
  const supabase = await createClient();
  const count = { count: "exact", head: true } as const;

  const [
    bazaarsToReview,
    proposalsToReview,
    documentsToReview,
    paymentsToReview,
    unassignedPackages,
    ordersToShip,
  ] = await Promise.all([
    supabase.from("bazaars").select("id", count).eq("status", "pending_review"),
    supabase
      .from("bazaar_profile_proposals")
      .select("id, bazaar:bazaars!inner(status)", count)
      .eq("status", "pending")
      .eq("bazaar.status", "approved"),
    supabase
      .from("bazaar_documents")
      .select("id, bazaar:bazaars!inner(status)", count)
      .eq("status", "pending")
      .in("bazaar.status", ["approved", "suspended"]),
    supabase.from("payments").select("id", count).eq("status", "pending"),
    supabase.from("packages").select("id", count).is("order_id", null),
    supabase.from("orders").select("id", count).eq("status", "complete"),
  ]);

  return {
    bazaarsToReview: bazaarsToReview.count ?? 0,
    proposalsToReview: proposalsToReview.count ?? 0,
    documentsToReview: documentsToReview.count ?? 0,
    paymentsToReview: paymentsToReview.count ?? 0,
    unassignedPackages: unassignedPackages.count ?? 0,
    ordersToShip: ordersToShip.count ?? 0,
  };
}
