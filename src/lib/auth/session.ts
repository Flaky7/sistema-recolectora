import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { fail, type ActionResult } from "@/lib/action-result";
import { createClient, type ServerClient } from "@/lib/supabase/server";

import { ROLE_HOME, type UserRole } from "./roles";

export type SessionProfile = {
  id: string;
  email: string | null;
  role: UserRole;
};

/** The signed-in user's profile, or null. Cached for the duration of one request. */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .maybeSingle();
    return profile;
  },
);

/**
 * For Server Components and layouts: returns the profile when it has the role, otherwise
 * redirects to sign in or to the home page of the user's own role.
 */
export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);
  return profile;
}

type Authorized = { supabase: ServerClient; profile: SessionProfile };

/**
 * For Server Actions: the user's Supabase client and profile when the role matches, or a
 * Spanish error to return as the action result.
 */
export async function authorize(
  ...roles: UserRole[]
): Promise<
  | { ok: true; supabase: ServerClient; profile: SessionProfile }
  | { ok: false; result: ActionResult<never> }
> {
  const profile = await getSessionProfile();
  if (!profile) {
    return {
      ok: false,
      result: fail("Tu sesión terminó. Vuelve a iniciar sesión.", {
        code: "UNAUTHENTICATED",
      }),
    };
  }
  if (!roles.includes(profile.role)) {
    return {
      ok: false,
      result: fail("No tienes permiso para hacer esto.", { code: "FORBIDDEN" }),
    };
  }
  const supabase = await createClient();
  return { ok: true, supabase, profile } satisfies { ok: true } & Authorized;
}
