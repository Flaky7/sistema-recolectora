import type { Metadata } from "next";
import Link from "next/link";

import { SignUpCustomerForm } from "@/features/customers/components/sign-up-customer-form";

export const metadata: Metadata = { title: "Registro de clienta" };

export default function SignUpCustomerPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Crea tu cuenta de clienta</h1>
        <p className="text-muted-foreground">
          Recibirás un código para que los bazares lo escriban en la etiqueta de tus paquetes.
        </p>
      </div>
      <SignUpCustomerForm />
      <p className="text-muted-foreground text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="text-primary underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </div>
  );
}
