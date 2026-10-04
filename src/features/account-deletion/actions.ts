"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fromZodError, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";
import { uuid } from "@/lib/validation/messages";

import {
  deleteBazaarWith,
  deleteCustomerWith,
  deleteOwnAccountWith,
} from "./service";

const CONFIRMATION = "ELIMINAR";

const confirmation = z
  .string()
  .trim()
  .refine(
    (value) => value.toUpperCase() === CONFIRMATION,
    `Escribe ${CONFIRMATION} para confirmar.`,
  );

/** FR-046: the customer or bazaar deletes its own account; then the session is closed. */
export async function deleteMyAccount(input: {
  confirmation: string;
}): Promise<ActionResult<never>> {
  const auth = await authorize("customer", "bazaar");
  if (!auth.ok) return auth.result;
  const parsed = z.object({ confirmation }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await deleteOwnAccountWith(
    auth.supabase,
    auth.profile.id,
    auth.profile.role as "customer" | "bazaar",
  );
  if (!result.ok) return result;
  await auth.supabase.auth.signOut();
  redirect("/?cuenta=eliminada");
}

/** FR-047: the collector deletes a customer's personal data, cancelling open orders. */
export async function deleteCustomerData(input: {
  customerId: string;
  confirmation: string;
}): Promise<ActionResult<Record<string, never>>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = z.object({ customerId: uuid, confirmation }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await deleteCustomerWith(
    auth.supabase,
    parsed.data.customerId,
  );
  if (result.ok) {
    revalidatePath("/admin/clientas");
    revalidatePath("/admin/pedidos");
  }
  return result;
}

/** FR-047: the collector deletes a bazaar's personal data and files. */
export async function deleteBazaarData(input: {
  bazaarId: string;
  confirmation: string;
}): Promise<ActionResult<Record<string, never>>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = z.object({ bazaarId: uuid, confirmation }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await deleteBazaarWith(auth.supabase, parsed.data.bazaarId);
  if (result.ok) {
    revalidatePath("/admin/bazares");
    revalidatePath("/");
  }
  return result;
}
