"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PrivacyConsent } from "@/components/privacy-consent";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { signUpBazaar } from "../actions";
import { signUpBazaarSchema, type SignUpBazaarInput } from "../schemas";

/** Step 1: the account. After confirming the email, the bazaar completes its profile (R3). */
export function SignUpBazaarForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignUpBazaarInput>({
    resolver: zodResolver(signUpBazaarSchema),
    defaultValues: { email: "", password: "", acceptPrivacy: false },
  });

  async function onSubmit(values: SignUpBazaarInput) {
    setError(null);
    const result = await signUpBazaar(values);
    if (!result.ok) return setError(applyActionErrors(result, form.setError));
    setSentTo(form.getValues("email"));
  }

  if (sentTo) {
    return (
      <div role="status" className="bg-muted space-y-3 rounded-xl p-5">
        <MailCheckIcon className="text-primary size-8" aria-hidden />
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <p>
          Te enviamos un enlace a <strong>{sentTo}</strong>. Al abrirlo podrás
          completar la ficha de tu bazar y enviarla a revisión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          form={form}
          name="email"
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
        />
        <TextField
          form={form}
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          description="Al menos 8 caracteres, con letras y números."
        />
        <PrivacyConsent form={form} name="acceptPrivacy" />
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Creando tu cuenta…"
            : "Crear cuenta de bazar"}
        </Button>
      </FieldGroup>
    </form>
  );
}
