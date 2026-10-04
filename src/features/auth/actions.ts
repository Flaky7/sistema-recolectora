"use server";

import { redirect } from "next/navigation";

import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { ROLE_HOME, safeNextPath, sectionFor } from "@/lib/auth/roles";
import { siteUrl } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

import {
  requestPasswordResetSchema,
  signInSchema,
  updatePasswordSchema,
  type RequestPasswordResetInput,
  type SignInInput,
  type UpdatePasswordInput,
} from "./schemas";

/** Signs in and tells the form where to go: the requested page if it fits the role, or home. */
export async function signIn(
  input: SignInInput,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail(
        "Aún no confirmas tu correo. Abre el enlace que te enviamos para activar tu cuenta.",
        { code: "EMAIL_NOT_CONFIRMED" },
      );
    }
    return fail("El correo o la contraseña no son correctos.", {
      code: "INVALID_CREDENTIALS",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (!profile) {
    await supabase.auth.signOut();
    return fail("Tu cuenta ya no existe.");
  }

  const home = ROLE_HOME[profile.role];
  const next = safeNextPath(parsed.data.next);
  const nextSection = next ? sectionFor(next) : undefined;
  const redirectTo =
    next && (!nextSection || nextSection.role === profile.role) ? next : home;
  return ok({ redirectTo });
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Always answers the same way so the form does not reveal which emails have an account. */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: siteUrl("/auth/callback?next=/recuperar/nueva"),
  });
  return ok({});
}

export async function updatePassword(
  input: UpdatePasswordInput,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) {
    return fail(
      "El enlace para cambiar tu contraseña ya expiró. Pide uno nuevo.",
      { code: "UNAUTHENTICATED" },
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "same_password") {
      return fail("La nueva contraseña debe ser distinta a la anterior.");
    }
    return fail("No pudimos cambiar tu contraseña. Intenta de nuevo.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.claims.sub)
    .single();
  return ok({ redirectTo: profile ? ROLE_HOME[profile.role] : "/" });
}
