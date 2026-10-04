import type { Metadata } from "next";
import Link from "next/link";

import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { getSessionProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Reached from the recovery email: /auth/callback signs the user in and sends them here. */
export default async function NewPasswordPage() {
  const profile = await getSessionProfile();
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Elige tu nueva contraseña</h1>
      {profile ? (
        <UpdatePasswordForm />
      ) : (
        <p className="bg-muted rounded-lg p-4">
          El enlace ya expiró.{" "}
          <Link href="/recuperar" className="text-primary underline">
            Pide uno nuevo
          </Link>
          .
        </p>
      )}
    </div>
  );
}
