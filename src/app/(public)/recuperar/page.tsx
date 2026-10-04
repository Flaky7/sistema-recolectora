import type { Metadata } from "next";

import { RequestResetForm } from "@/features/auth/components/request-reset-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RequestResetPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-muted-foreground">
          Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva
          contraseña.
        </p>
      </div>
      <RequestResetForm />
    </div>
  );
}
