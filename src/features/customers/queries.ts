import "server-only";

import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizeCustomerCode } from "@/lib/validation/customer-code";
import { normalizePhone } from "@/lib/validation/phone";

import type { CustomerStatus } from "./labels";

export async function getMyCustomer() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select()
    .eq("profile_id", profile.id)
    .maybeSingle();
  return data;
}

export async function getCustomerByCode(code: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select()
    .eq("code", normalizeCustomerCode(code))
    .maybeSingle();
  return data;
}

export type CustomerFilters = {
  q?: string;
  status?: CustomerStatus;
  hasAccount?: boolean;
};

/** Collector's list: search by name, code or WhatsApp (FR-039). */
export async function listCustomers({ q, status, hasAccount }: CustomerFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, code, full_name, whatsapp, type, status, profile_id, created_at")
    .order("full_name")
    .limit(200);

  const term = q?.trim();
  if (term) {
    const code = normalizeCustomerCode(term);
    const digits = normalizePhone(term);
    const safe = term.replace(/[%_,()]/g, " ");
    const filters = [`full_name.ilike.%${safe}%`, `code.eq.${code.replace(/[^A-Z0-9]/g, "")}`];
    if (digits.length >= 3) filters.push(`whatsapp.ilike.%${digits}%`);
    query = query.or(filters.join(","));
  }
  if (status) query = query.eq("status", status);
  if (hasAccount === true) query = query.not("profile_id", "is", null);
  if (hasAccount === false) query = query.is("profile_id", null);

  const { data } = await query;
  return data ?? [];
}
