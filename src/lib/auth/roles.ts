import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/** Home page of each role (contracts/routes.md). */
export const ROLE_HOME: Record<UserRole, string> = {
  collector: "/admin",
  customer: "/mi-cuenta",
  bazaar: "/bazar",
};

/** Protected sections and the only role allowed in each. */
export const PROTECTED_SECTIONS: readonly { prefix: string; role: UserRole }[] =
  [
    { prefix: "/admin", role: "collector" },
    { prefix: "/mi-cuenta", role: "customer" },
    { prefix: "/bazar", role: "bazaar" },
  ];

export function sectionFor(pathname: string) {
  return PROTECTED_SECTIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Only same-site relative paths are accepted as a destination after signing in. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
