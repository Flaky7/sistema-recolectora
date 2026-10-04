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
import { siteUrl } from "@/lib/notifications";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import {
  createCustomerSchema,
  setCustomerActiveSchema,
  signUpCustomerSchema,
  updateCustomerProfileSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type SetCustomerActiveInput,
  type SignUpCustomerInput,
  type UpdateCustomerInput,
  type UpdateCustomerProfileInput,
} from "./schemas";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];

const DUPLICATE_WHATSAPP = "Ya hay una clienta registrada con ese WhatsApp.";

/**
 * Public sign-up (FR-006). check_customer_claim decides first, so the form can ask for the
 * customer code or warn about an existing account without revealing any data (FR-044).
 */
export async function signUpCustomer(
  input: SignUpCustomerInput,
): Promise<ActionResult<{ needsEmailConfirmation: true }>> {
  const parsed = signUpCustomerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const supabase = await createClient();
  const { data: claim, error: claimError } = await supabase.rpc(
    "check_customer_claim",
    { whatsapp: data.whatsapp, code: data.customerCode },
  );
  if (claimError) return fromDatabaseError(claimError);

  switch (claim) {
    case "has_account":
      return fail("Ya existe una cuenta con ese número.", {
        code: "ACCOUNT_EXISTS",
      });
    case "locked":
      return fail(
        "Este número tiene demasiados intentos con un código incorrecto. Pide ayuda a la recolectora.",
        { code: "CLAIM_LOCKED" },
      );
    case "code_required":
      return fail(
        data.customerCode
          ? "El código no coincide. Pídele tu código a la recolectora."
          : "Ese número ya está registrado por la recolectora. Escribe tu código de clienta para ligar tu cuenta.",
        {
          code: "CODE_REQUIRED",
          fieldErrors: data.customerCode
            ? { customerCode: ["El código no coincide."] }
            : undefined,
        },
      );
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: siteUrl("/auth/callback"),
      data: {
        role: "customer",
        privacy_accepted: data.acceptPrivacy,
        full_name: data.fullName,
        whatsapp: data.whatsapp,
        shipping_address: data.shippingAddress,
        type: data.type,
        customer_code: data.customerCode ?? null,
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return fail("Elige una contraseña más segura.", {
        fieldErrors: { password: ["Elige una contraseña más segura."] },
      });
    }
    return fail("No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo.");
  }
  return ok({ needsEmailConfirmation: true });
}

export async function updateCustomerProfile(
  input: UpdateCustomerProfileInput,
): Promise<ActionResult<Customer>> {
  const auth = await authorize("customer");
  if (!auth.ok) return auth.result;
  const parsed = updateCustomerProfileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data, error } = await auth.supabase
    .from("customers")
    .update({
      whatsapp: parsed.data.whatsapp,
      shipping_address: parsed.data.shippingAddress,
      type: parsed.data.type,
    })
    .eq("profile_id", auth.profile.id)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return fail(DUPLICATE_WHATSAPP);
    if (error.code === "PGRST116") {
      return fail("Tu cuenta está dada de baja; contacta a la recolectora.");
    }
    return fromDatabaseError(error);
  }
  revalidatePath("/mi-cuenta");
  return ok(data);
}

/** FR-041: a customer without an account, with her own code. */
export async function createCustomer(
  input: CreateCustomerInput,
): Promise<ActionResult<Customer>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data, error } = await auth.supabase
    .from("customers")
    .insert({
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      shipping_address: parsed.data.shippingAddress,
      type: parsed.data.type,
      created_by: auth.profile.id,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return fail(DUPLICATE_WHATSAPP);
    return fromDatabaseError(error);
  }
  revalidatePath("/admin/clientas");
  return ok(data);
}

/** FR-008: the collector edits name, WhatsApp, address and type; never the code. */
export async function updateCustomer(
  input: UpdateCustomerInput,
): Promise<ActionResult<Customer>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data, error } = await auth.supabase
    .from("customers")
    .update({
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      shipping_address: parsed.data.shippingAddress,
      type: parsed.data.type,
    })
    .eq("id", parsed.data.customerId)
    .neq("status", "deleted")
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return fail(DUPLICATE_WHATSAPP);
    return fromDatabaseError(error);
  }
  revalidatePath(`/admin/clientas/${data.code}`);
  return ok(data);
}

/** FR-049: temporary deactivation and reactivation. */
export async function setCustomerActive(
  input: SetCustomerActiveInput,
): Promise<ActionResult<Customer>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = setCustomerActiveSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data, error } = await auth.supabase
    .from("customers")
    .update({ status: parsed.data.active ? "active" : "deactivated" })
    .eq("id", parsed.data.customerId)
    .in("status", ["active", "deactivated"])
    .select()
    .single();
  if (error) return fromDatabaseError(error);
  revalidatePath(`/admin/clientas/${data.code}`);
  return ok(data);
}

/** Lets the collector unlock a customer after too many wrong codes (research R22). */
export async function resetClaimAttempts(
  customerId: string,
): Promise<ActionResult<Customer>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const { data, error } = await auth.supabase
    .from("customers")
    .update({ claim_failed_attempts: 0 })
    .eq("id", customerId)
    .select()
    .single();
  if (error) return fromDatabaseError(error);
  revalidatePath(`/admin/clientas/${data.code}`);
  return ok(data);
}
