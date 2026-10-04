import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { next, error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      {error === "enlace" ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          El enlace ya expiró o no es válido. Inicia sesión o pide uno nuevo.
        </p>
      ) : null}
      <SignInForm next={typeof next === "string" ? next : undefined} />
      <div className="text-muted-foreground space-y-2 border-t pt-4 text-center text-sm">
        <p>¿Aún no tienes cuenta?</p>
        <p className="flex flex-col gap-1">
          <Link href="/registro/clienta" className="text-primary inline-flex min-h-11 items-center justify-center underline-offset-4 hover:underline">
            Registrarme como clienta
          </Link>
          <Link href="/registro/bazar" className="text-primary inline-flex min-h-11 items-center justify-center underline-offset-4 hover:underline">
            Registrar mi bazar
          </Link>
        </p>
      </div>
    </div>
  );
}
