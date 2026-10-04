import "server-only";

import { createClient } from "@/lib/supabase/server";

export { getPaymentInfo } from "@/features/payments/queries";

/** The full settings row; only the collector can read it (RLS, research R19). */
export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select().eq("id", 1).maybeSingle();
  return data;
}
