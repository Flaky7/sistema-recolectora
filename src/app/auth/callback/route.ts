import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { ROLE_HOME, safeNextPath } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Email links (confirmation and password recovery) land here with a token_hash (research R21),
 * so they work even when opened on another device or browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  let userId: string | undefined;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user.id;
  }

  if (!userId) {
    return NextResponse.redirect(`${origin}/entrar?error=enlace`);
  }

  if (next) return NextResponse.redirect(`${origin}${next}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const home = profile ? ROLE_HOME[profile.role] : "/";
  return NextResponse.redirect(`${origin}${home}?bienvenida=1`);
}
