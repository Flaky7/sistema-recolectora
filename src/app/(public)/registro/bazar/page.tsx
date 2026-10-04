import type { Metadata } from "next";
import Link from "next/link";

import { SignUpBazaarForm } from "@/features/bazaars/components/sign-up-bazaar-form";

export const metadata: Metadata = { title: "Registrar mi bazar" };

export default function SignUpBazaarPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Registra tu bazar</h1>
        <p className="text-muted-foreground">
          Crea tu cuenta y después completa tu ficha: nombre, marcas, link de tu página, fotos
          (opcionales), tus documentos y 3 referencias. La recolectora la revisará antes de
          publicarla en el directorio.
        </p>
      </div>
      <SignUpBazaarForm />
      <p className="text-muted-foreground text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="text-primary underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </div>
  );
}
