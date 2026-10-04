"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PrivacyConsent } from "@/components/privacy-consent";
import { TextAreaField, TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { signUpCustomer } from "../actions";
import { signUpCustomerSchema, type SignUpCustomerInput } from "../schemas";
import { CustomerTypeField } from "./customer-type-field";

export function SignUpCustomerForm() {
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [askCode, setAskCode] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<SignUpCustomerInput>({
    resolver: zodResolver(signUpCustomerSchema),
    defaultValues: {
      fullName: "",
      whatsapp: "",
      shippingAddress: "",
      email: "",
      password: "",
      acceptPrivacy: false,
      customerCode: "",
    },
  });

  async function onSubmit(values: SignUpCustomerInput) {
    setError(null);
    setErrorCode(undefined);
    const result = await signUpCustomer(values);
    if (!result.ok) {
      if (result.code === "CODE_REQUIRED") setAskCode(true);
      setErrorCode(result.code);
      setError(applyActionErrors(result, form.setError));
      return;
    }
    setSentTo(form.getValues("email"));
  }

  if (sentTo) {
    return (
      <div role="status" className="bg-muted space-y-3 rounded-xl p-5">
        <MailCheckIcon className="text-primary size-8" aria-hidden />
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <p>
          Te enviamos un enlace a <strong>{sentTo}</strong> para confirmar tu
          cuenta. Al abrirlo verás tu código de clienta.
        </p>
        <p className="text-muted-foreground text-sm">
          Si no lo ves, busca en la carpeta de correo no deseado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          form={form}
          name="fullName"
          label="Nombre completo"
          autoComplete="name"
        />
        <TextField
          form={form}
          name="whatsapp"
          label="WhatsApp"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="664 123 4567"
          description="10 dígitos. Aquí te avisaremos cuando lleguen tus paquetes."
        />
        {askCode ? (
          <TextField
            form={form}
            name="customerCode"
            label="Código de clienta"
            autoCapitalize="characters"
            autoComplete="off"
            className="font-mono tracking-widest uppercase"
            maxLength={7}
            description="La recolectora ya te registró con ese WhatsApp. Escribe el código de 5 letras y números que te dio para ligar tu cuenta."
          />
        ) : null}
        <TextAreaField
          form={form}
          name="shippingAddress"
          label="Dirección de envío"
          autoComplete="street-address"
          rows={3}
          placeholder="Calle, número, colonia, ciudad y código postal"
        />
        <CustomerTypeField form={form} name="type" />
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
          <div
            role="alert"
            className="bg-destructive/10 text-destructive space-y-2 rounded-lg p-3 text-sm"
          >
            <p>{error}</p>
            {errorCode === "ACCOUNT_EXISTS" ? (
              <p className="flex gap-4">
                <Link href="/entrar" className="font-medium underline">
                  Iniciar sesión
                </Link>
                <Link href="/recuperar" className="font-medium underline">
                  Recuperar contraseña
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Creando tu cuenta…"
            : "Crear mi cuenta"}
        </Button>
      </FieldGroup>
    </form>
  );
}
