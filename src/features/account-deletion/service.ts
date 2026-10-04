import "server-only";

import { fail, fromDatabaseError, ok, type ActionResult } from "@/lib/action-result";
import { deleteAuthUser, deleteStorageObjects } from "@/lib/supabase/admin";
import type { ServerClient } from "@/lib/supabase/server";

/**
 * Deletion in the order of research R16: (1) anonymize in SQL with the caller's session, which
 * checks ownership or the collector role; (2) delete the files; (3) delete the Auth user.
 * Steps 2 and 3 are idempotent, so the action can be retried if one of them fails.
 */

type FileRef = { bucket: string; path: string };

async function deleteFiles(files: FileRef[]) {
  const byBucket = new Map<string, string[]>();
  for (const file of files) {
    if (!file.path) continue;
    byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file.path]);
  }
  for (const [bucket, paths] of byBucket) {
    await deleteStorageObjects(bucket, paths);
  }
}

async function finish(files: FileRef[], userId: string | null): Promise<ActionResult<Record<string, never>>> {
  try {
    await deleteFiles(files);
    if (userId) await deleteAuthUser(userId);
  } catch {
    return fail(
      "Los datos se eliminaron, pero faltó borrar algunos archivos o la cuenta de acceso. Intenta de nuevo.",
      { code: "RETRY" },
    );
  }
  return ok({});
}

export async function deleteCustomerWith(
  supabase: ServerClient,
  customerId: string,
): Promise<ActionResult<Record<string, never>>> {
  const { data: customer } = await supabase
    .from("customers")
    .select("id, profile_id")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) return fail("No encontramos a la clienta.", { code: "NOT_FOUND" });

  const { data: files, error } = await supabase.rpc("anonymize_customer", { customer_id: customerId });
  if (error) return fromDatabaseError(error);
  return finish(files ?? [], customer.profile_id);
}

export async function deleteBazaarWith(
  supabase: ServerClient,
  bazaarId: string,
): Promise<ActionResult<Record<string, never>>> {
  const { data: bazaar } = await supabase
    .from("bazaars")
    .select("id, profile_id")
    .eq("id", bazaarId)
    .maybeSingle();
  if (!bazaar) return fail("No encontramos el bazar.", { code: "NOT_FOUND" });

  const { data: files, error } = await supabase.rpc("anonymize_bazaar", { bazaar_id: bazaarId });
  if (error) return fromDatabaseError(error);
  return finish(files ?? [], bazaar.profile_id);
}

/**
 * Self-service (FR-046). If an earlier attempt already anonymized the data but could not delete
 * the Auth user, the customer/bazaar row is no longer linked: only step 3 remains.
 */
export async function deleteOwnAccountWith(
  supabase: ServerClient,
  userId: string,
  role: "customer" | "bazaar",
): Promise<ActionResult<Record<string, never>>> {
  const table = role === "customer" ? "customers" : "bazaars";
  const { data: own } = await supabase.from(table).select("id").eq("profile_id", userId).maybeSingle();
  if (!own) return finish([], userId);
  return role === "customer"
    ? deleteCustomerWith(supabase, own.id)
    : deleteBazaarWith(supabase, own.id);
}
