"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { TextAreaField, TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { updateCustomerProfile } from "../actions";
import type { CustomerType } from "../labels";
import {
  updateCustomerProfileSchema,
  type UpdateCustomerProfileInput,
} from "../schemas";
import { CustomerTypeField } from "./customer-type-field";

/** The customer edits her WhatsApp, address and type (FR-008). */
export function CustomerProfileForm({
  defaults,
  disabled,
}: {
  defaults: { whatsapp: string; shippingAddress: string; type: CustomerType };
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdateCustomerProfileInput>({
    resolver: zodResolver(updateCustomerProfileSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: UpdateCustomerProfileInput) {
    setError(null);
    const result = await updateCustomerProfile(values);
    if (!result.ok) {
      setError(applyActionErrors(result, form.setError));
      return;
    }
    form.reset({
      whatsapp: result.data.whatsapp ?? "",
      shippingAddress: result.data.shipping_address ?? "",
      type: result.data.type,
    });
    toast.success("Tus datos se guardaron.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={disabled} className="contents">
        <FieldGroup>
          <TextField
            form={form}
            name="whatsapp"
            label="WhatsApp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
          />
          <TextAreaField
            form={form}
            name="shippingAddress"
            label="Dirección de envío"
            rows={3}
          />
          <CustomerTypeField form={form} name="type" />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            size="touch"
            variant="outline"
            className="w-full"
            disabled={
              disabled || form.formState.isSubmitting || !form.formState.isDirty
            }
          >
            Guardar mis datos
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
