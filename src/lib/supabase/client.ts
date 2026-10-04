import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/** Supabase client for the browser: uploads files to Storage with the user's session. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
