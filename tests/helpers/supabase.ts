/**
 * Helpers for integration tests against the local Supabase stack (`pnpm supabase start`).
 * The service-role client below is for TESTS ONLY: it bypasses RLS to prepare data, and every
 * assertion about permissions uses a client signed in as the role being tested.
 */
import { execSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;
export type Role = "collector" | "customer" | "bazaar";

export const TEST_PASSWORD = "Prueba123!";

type Env = { url: string; anonKey: string; serviceKey: string };

let cachedEnv: Env | null = null;

/** Reads keys from the environment, or from `supabase status` when running locally. */
export function supabaseEnv(): Env {
  if (cachedEnv) return cachedEnv;
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    const status = JSON.parse(
      execSync("pnpm exec supabase status -o json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as Record<string, string>;
    url ??= status.API_URL;
    anonKey ??= status.ANON_KEY;
    serviceKey ??= status.SERVICE_ROLE_KEY;
  }
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "Supabase local no está corriendo: ejecuta `pnpm supabase start`.",
    );
  }
  cachedEnv = { url, anonKey, serviceKey };
  return cachedEnv;
}

/** Server modules (src/lib/supabase/admin.ts) read these variables when called. */
export function ensureServerEnv() {
  const { url, anonKey, serviceKey } = supabaseEnv();
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= serviceKey;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service role: bypasses RLS. Only to arrange data and to inspect results. */
export function adminClient(): Client {
  const { url, serviceKey } = supabaseEnv();
  return createClient<Database>(url, serviceKey, noSession);
}

export function anonClient(): Client {
  const { url, anonKey } = supabaseEnv();
  return createClient<Database>(url, anonKey, noSession);
}

export async function signInAs(
  email: string,
  password = TEST_PASSWORD,
): Promise<Client> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error)
    throw new Error(
      `No se pudo iniciar sesión como ${email}: ${error.message}`,
    );
  return client;
}

let counter = 0;

/** Unique values so test files never collide (the database is shared). */
export function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function uniqueEmail(role: string): string {
  return `${unique(role)}@it.test`;
}

/** Random 10-digit number starting with 9 (seed numbers start with 5 or 6). */
export function uniquePhone(): string {
  return `9${Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, "0")}`;
}

export type TestUser = {
  id: string;
  email: string;
  client: Client;
  /** customers.id or bazaars.id */
  entityId: string | null;
};

const createdUsers: string[] = [];

type CustomerData = {
  fullName?: string;
  whatsapp?: string;
  shippingAddress?: string;
  type?: "local" | "out_of_town";
  customerCode?: string;
};

/**
 * Creates a confirmed user through Auth so handle_new_user() runs like a real sign-up.
 * A collector signs up as a customer and is promoted, as in the README.
 */
export async function createTestUser(
  role: Role,
  data: CustomerData = {},
): Promise<TestUser> {
  const admin = adminClient();
  const email = uniqueEmail(role);
  const metadata =
    role === "bazaar"
      ? { role: "bazaar", privacy_accepted: true }
      : {
          role: "customer",
          privacy_accepted: true,
          full_name: data.fullName ?? "Clienta de Prueba",
          whatsapp: data.whatsapp ?? uniquePhone(),
          shipping_address:
            data.shippingAddress ?? "Calle de Prueba 123, Tijuana, B.C.",
          type: data.type ?? "local",
          customer_code: data.customerCode,
        };

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !created.user) {
    throw new Error(`createTestUser(${role}) falló: ${error?.message}`);
  }
  createdUsers.push(created.user.id);

  if (role === "collector") {
    const { error: promoteError } = await admin.rpc("promote_to_collector", {
      email,
    });
    if (promoteError)
      throw new Error(`promote_to_collector: ${promoteError.message}`);
  }

  let entityId: string | null = null;
  if (role === "customer") {
    const { data: row } = await admin
      .from("customers")
      .select("id")
      .eq("profile_id", created.user.id)
      .single();
    entityId = row?.id ?? null;
  } else if (role === "bazaar") {
    const { data: row } = await admin
      .from("bazaars")
      .select("id")
      .eq("profile_id", created.user.id)
      .single();
    entityId = row?.id ?? null;
  }

  return {
    id: created.user.id,
    email,
    client: await signInAs(email),
    entityId,
  };
}

/** Deletes the Auth users created by this test file; business rows stay, as after FR-048. */
export async function resetTestData(): Promise<void> {
  const admin = adminClient();
  while (createdUsers.length > 0) {
    const id = createdUsers.pop()!;
    await admin.auth.admin.deleteUser(id);
  }
}

/** Unwraps a supabase-js result, failing the test with the database message. */
export function must<T>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  // Updates without .select() return null data; callers that need rows always select them.
  return result.data as NonNullable<T>;
}
