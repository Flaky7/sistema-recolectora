"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { requestPasswordReset } from "../actions";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "../schemas";

export function RequestResetForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RequestPasswordResetInput) {
    setError(null);
    const result = await requestPasswordReset(values);
    if (!result.ok) {
      setError(applyActionErrors(result, form.setError));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="bg-muted rounded-lg p-4">
        Si el correo tiene una cuenta, te enviamos un enlace para elegir una
        nueva contraseña. Revisa tu bandeja de entrada y la de correo no
        deseado.
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          form={form}
          name="email"
          label="Correo de tu cuenta"
          type="email"
          autoComplete="email"
          inputMode="email"
        />
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
          Enviar enlace
        </Button>
      </FieldGroup>
    </form>
  );
}
