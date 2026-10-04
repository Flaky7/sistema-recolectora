import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Payments waiting for the collector's review, oldest first (US1, scenario 2). */
export async function listPendingPayments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, proof_path, created_at, order:orders(id, folio, status, customer:customers(id, code, full_name))",
    )
    .eq("status", "pending")
    .order("created_at");
  return data ?? [];
}

export type PendingPayment = Awaited<
  ReturnType<typeof listPendingPayments>
>[number];

/** Deposit amount and instructions for customers (FR-010, research R19). */
export async function getPaymentInfo() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_payment_info");
  return data?.[0] ?? null;
}
