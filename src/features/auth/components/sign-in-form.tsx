"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { signIn } from "../actions";
import { signInSchema, type SignInInput } from "../schemas";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", next },
  });

  async function onSubmit(values: SignInInput) {
    setError(null);
    const result = await signIn(values);
    if (!result.ok) {
      setError(applyActionErrors(result, form.setError));
      return;
    }
    router.replace(result.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          form={form}
          name="email"
          label="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <TextField
          form={form}
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
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
          {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
        <Link
          href="/recuperar"
          className="text-primary inline-flex min-h-11 items-center justify-center text-sm underline-offset-4 hover:underline"
        >
          Olvidé mi contraseña
        </Link>
      </FieldGroup>
    </form>
  );
}
