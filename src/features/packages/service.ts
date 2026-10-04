import "server-only";

import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { notify, type NotifyCustomer } from "@/lib/notifications";
import type { DeliveryResult } from "@/lib/notifications/types";
import type { Database } from "@/lib/supabase/database.types";
import type { ServerClient } from "@/lib/supabase/server";
import { isPathInFolder, UNIDENTIFIED_FOLDER } from "@/lib/uploads/paths";

import type { AssignPackageInput, RegisterPackageInput } from "./schemas";

/**
 * Package rules shared by the Server Actions and the integration tests. Every function receives
 * the caller's Supabase client, so RLS and triggers decide what is allowed.
 */

export type Package = Database["public"]["Tables"]["packages"]["Row"];

export type PackageResult = {
  package: Package;
  notification: DeliveryResult | null;
  /** Packages received for the order after this one, when it has an order. */
  received: number | null;
  expected: number | null;
};

type Parsed<T> = Omit<T, "note"> & { note?: string };

async function loadCustomer(supabase: ServerClient, customerId: string) {
  const { data } = await supabase
    .from("customers")
    .select("id, full_name, whatsapp, profile_id")
    .eq("id", customerId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    whatsapp: data.whatsapp,
    hasAccount: data.profile_id !== null,
  } satisfies NotifyCustomer;
}

async function orderCounts(supabase: ServerClient, orderId: string) {
  const { data } = await supabase
    .from("order_summaries")
    .select("folio, expected_packages, received_packages")
    .eq("id", orderId)
    .single();
  return data;
}

/** Message for a package that now belongs to an order (package_received) or only to a customer. */
async function packageMessage(
  supabase: ServerClient,
  pkg: Package,
  kind: "package_received" | "package_unassigned",
): Promise<Omit<PackageResult, "package">> {
  const customer = pkg.customer_id
    ? await loadCustomer(supabase, pkg.customer_id)
    : null;
  const bazarName = pkg.bazaar_name ?? "un bazar";

  if (kind === "package_received" && pkg.order_id) {
    const counts = await orderCounts(supabase, pkg.order_id);
    const received = counts?.received_packages ?? null;
    const expected = counts?.expected_packages ?? null;
    if (!customer || !counts) return { notification: null, received, expected };
    const notification = await notify(supabase, {
      kind: "package_received",
      customer,
      orderId: pkg.order_id,
      packageId: pkg.id,
      folio: counts.folio!,
      bazarName,
      received: received ?? 0,
      expected: expected ?? 0,
    });
    return { notification, received, expected };
  }

  if (!customer) return { notification: null, received: null, expected: null };
  const notification = await notify(supabase, {
    kind: "package_unassigned",
    customer,
    packageId: pkg.id,
    bazarName,
  });
  return { notification, received: null, expected: null };
}

/** FR-016 to FR-018. Unidentified packages never generate a message. */
export async function registerPackageWith(
  supabase: ServerClient,
  input: Parsed<RegisterPackageInput>,
): Promise<ActionResult<PackageResult>> {
  const folder = input.customerId ?? UNIDENTIFIED_FOLDER;
  if (!isPathInFolder(input.photoPath, folder)) {
    return fail("La foto no es válida. Vuelve a tomarla.");
  }

  const { data: pkg, error } = await supabase
    .from("packages")
    .insert({
      customer_id: input.customerId ?? null,
      order_id: input.orderId ?? null,
      bazaar_id: input.bazaarId ?? null,
      bazaar_name: input.bazaarId ? null : (input.bazaarName ?? null),
      note: input.note ?? null,
      photo_path: input.photoPath,
    })
    .select()
    .single();
  if (error) return fromDatabaseError(error);

  if (!pkg.customer_id) {
    return ok({
      package: pkg,
      notification: null,
      received: null,
      expected: null,
    });
  }
  const rest = await packageMessage(
    supabase,
    pkg,
    pkg.order_id ? "package_received" : "package_unassigned",
  );
  return ok({ package: pkg, ...rest });
}

/**
 * Assigns an unidentified or order-less package, or moves it between orders of the same
 * customer. A message is generated only when the package reaches its first order
 * (package_received) or its customer for the first time (package_unassigned).
 */
export async function assignPackageWith(
  supabase: ServerClient,
  input: AssignPackageInput,
): Promise<ActionResult<PackageResult>> {
  const { data: before } = await supabase
    .from("packages")
    .select("id, customer_id, order_id")
    .eq("id", input.packageId)
    .single();
  if (!before)
    return fail("No encontramos ese paquete.", { code: "NOT_FOUND" });
  if (before.customer_id && before.customer_id !== input.customerId) {
    return fail("Este paquete ya es de otra clienta.");
  }

  const { data: pkg, error } = await supabase
    .from("packages")
    .update({ customer_id: input.customerId, order_id: input.orderId ?? null })
    .eq("id", input.packageId)
    .select()
    .single();
  if (error) return fromDatabaseError(error);

  if (pkg.order_id && !before.order_id) {
    return ok({
      package: pkg,
      ...(await packageMessage(supabase, pkg, "package_received")),
    });
  }
  if (!pkg.order_id && !before.customer_id) {
    return ok({
      package: pkg,
      ...(await packageMessage(supabase, pkg, "package_unassigned")),
    });
  }
  const counts = pkg.order_id
    ? await orderCounts(supabase, pkg.order_id)
    : null;
  return ok({
    package: pkg,
    notification: null,
    received: counts?.received_packages ?? null,
    expected: counts?.expected_packages ?? null,
  });
}
