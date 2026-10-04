"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { updatePassword } from "../actions";
import { updatePasswordSchema, type UpdatePasswordInput } from "../schemas";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: UpdatePasswordInput) {
    setError(null);
    const result = await updatePassword(values);
    if (!result.ok) {
      setError(applyActionErrors(result, form.setError));
      return;
    }
    toast.success("Listo, tu contraseña cambió.");
    router.replace(result.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          form={form}
          name="password"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          description="Al menos 8 caracteres, con letras y números."
        />
        <TextField
          form={form}
          name="confirmPassword"
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
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
          Guardar contraseña
        </Button>
      </FieldGroup>
    </form>
  );
}
