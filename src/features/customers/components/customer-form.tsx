"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { TextAreaField, TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { createCustomer, updateCustomer, type Customer } from "../actions";
import { createCustomerSchema, type CreateCustomerInput } from "../schemas";
import { CustomerTypeField } from "./customer-type-field";

/** Collector creates a customer without an account (FR-041) or edits any customer (FR-008). */
export function CustomerForm({
  customerId,
  defaults,
  onCreated,
}: {
  customerId?: string;
  defaults?: CreateCustomerInput;
  onCreated?: (customer: Customer) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: defaults ?? { fullName: "", whatsapp: "", shippingAddress: "" },
  });

  async function onSubmit(values: CreateCustomerInput) {
    setError(null);
    const result = customerId
      ? await updateCustomer({ ...values, customerId })
      : await createCustomer(values);
    if (!result.ok) return setError(applyActionErrors(result, form.setError));
    if (customerId) {
      toast.success("Datos guardados.");
      form.reset(values);
      router.refresh();
    } else {
      onCreated?.(result.data);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField form={form} name="fullName" label="Nombre completo" autoComplete="off" />
        <TextField
          form={form}
          name="whatsapp"
          label="WhatsApp"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          description="10 dígitos."
        />
        <TextAreaField form={form} name="shippingAddress" label="Dirección de envío" rows={3} />
        <CustomerTypeField form={form} name="type" legend="Tipo de clienta" />
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting || (Boolean(customerId) && !form.formState.isDirty)}
        >
          {customerId ? "Guardar cambios" : "Dar de alta"}
        </Button>
      </FieldGroup>
    </form>
  );
}
