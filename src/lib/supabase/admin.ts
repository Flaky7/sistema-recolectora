import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * The ONLY place in the app that uses the service role key (research R16). It bypasses RLS, so
 * it exposes just the two operations that cannot be done with the user's session: deleting
 * Storage objects of someone else and deleting an Auth user. Only src/features/account-deletion/
 * may import it (ESLint rule), and only after checking permissions with the normal session.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Deletes files; succeeds when they are already gone, so a retry is safe. */
export async function deleteStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await adminClient().storage.from(bucket).remove(paths);
  if (error) throw new Error(`No se pudieron borrar archivos de ${bucket}: ${error.message}`);
}

/** Deletes the Auth user; its profile goes with it (on delete cascade). Missing user = done. */
export async function deleteAuthUser(userId: string): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error && error.status !== 404) {
    throw new Error(`No se pudo borrar la cuenta de acceso: ${error.message}`);
  }
}
