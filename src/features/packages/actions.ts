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
import type { ServerClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/uploads/paths";
import { uuid } from "@/lib/validation/messages";

import type { OrderStatus } from "@/features/orders/status";

import {
  assignPackageSchema,
  registerPackageSchema,
  type AssignPackageInput,
  type RegisterPackageInput,
} from "./schemas";
import {
  assignPackageWith,
  registerPackageWith,
  type PackageResult,
} from "./service";

/** Package photos are shown through 60-minute signed links (FR-019, research R7). */
const PHOTO_URL_SECONDS = 60 * 60;

export type FoundCustomer = {
  id: string;
  code: string;
  fullName: string;
  type: "local" | "out_of_town";
  status: "active" | "deactivated" | "deleted";
  hasAccount: boolean;
  exactCode: boolean;
  activeOrders: {
    id: string;
    folio: number;
    status: OrderStatus;
    expected_packages: number;
    received_packages: number;
  }[];
};

function revalidatePackages(folio?: number | null) {
  revalidatePath("/admin/paquetes");
  revalidatePath("/admin");
  if (folio) {
    revalidatePath(`/admin/pedidos/${folio}`);
    revalidatePath(`/mi-cuenta/pedidos/${folio}`);
  }
}

/** By code (exact) or partial name or WhatsApp, with active orders (US2, scenarios 1 and 6). */
export async function findCustomerForPackage(
  query: string,
): Promise<ActionResult<FoundCustomer[]>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const term = query.trim().slice(0, 120);
  if (term.length < 2) return ok([]);

  const { data, error } = await auth.supabase.rpc("find_customer", { q: term });
  if (error) return fromDatabaseError(error);
  return ok(
    (data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      fullName: row.full_name,
      type: row.type,
      status: row.status,
      hasAccount: row.has_account,
      exactCode: row.exact_code,
      activeOrders: row.active_orders as FoundCustomer["activeOrders"],
    })),
  );
}

async function folioOf(supabase: ServerClient, orderId: string | null) {
  if (!orderId) return null;
  const { data } = await supabase
    .from("orders")
    .select("folio")
    .eq("id", orderId)
    .single();
  return data?.folio ?? null;
}

export async function registerPackage(
  input: RegisterPackageInput,
): Promise<ActionResult<PackageResult & { folio: number | null }>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = registerPackageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await registerPackageWith(auth.supabase, parsed.data);
  if (!result.ok) return result;
  const folio = await folioOf(auth.supabase, result.data.package.order_id);
  revalidatePackages(folio);
  return ok({ ...result.data, folio });
}

export async function assignPackage(
  input: AssignPackageInput,
): Promise<ActionResult<PackageResult & { folio: number | null }>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = assignPackageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await assignPackageWith(auth.supabase, parsed.data);
  if (!result.ok) return result;
  const folio = await folioOf(auth.supabase, result.data.package.order_id);
  revalidatePackages(folio);
  return ok({ ...result.data, folio });
}

/** Signed link created with the user's session: the owner customer or the collector (FR-019). */
export async function getPackagePhotoUrl(
  packageId: string,
): Promise<ActionResult<{ signedUrl: string; expiresAt: string }>> {
  const auth = await authorize("customer", "collector");
  if (!auth.ok) return auth.result;
  const parsed = uuid.safeParse(packageId);
  if (!parsed.success) return fail("Paquete no válido.");

  const { data: pkg } = await auth.supabase
    .from("packages")
    .select("photo_path")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!pkg) return fail("No encontramos ese paquete.", { code: "NOT_FOUND" });

  const { data, error } = await auth.supabase.storage
    .from(BUCKETS.packagePhotos)
    .createSignedUrl(pkg.photo_path, PHOTO_URL_SECONDS);
  if (error || !data) return fail("No tienes permiso para ver este archivo.");
  return ok({
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + PHOTO_URL_SECONDS * 1000).toISOString(),
  });
}
