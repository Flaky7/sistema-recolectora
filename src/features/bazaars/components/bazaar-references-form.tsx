"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { applyActionErrors } from "@/lib/forms";

import { saveBazaarReferences } from "../actions";
import { bazaarReferencesSchema, type BazaarReferencesInput } from "../schemas";

/** 3 references with name and phone; editable at any time, even while suspended (FR-028). */
export function BazaarReferencesForm({
  defaults,
}: {
  defaults: { fullName: string; phone: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const filled = [0, 1, 2].map((i) => defaults[i] ?? { fullName: "", phone: "" });
  const form = useForm<BazaarReferencesInput>({
    resolver: zodResolver(bazaarReferencesSchema),
    defaultValues: { references: filled },
  });

  async function onSubmit(values: BazaarReferencesInput) {
    setError(null);
    const result = await saveBazaarReferences(values);
    if (!result.ok) return setError(applyActionErrors(result, form.setError));
    form.reset(values);
    toast.success("Referencias guardadas.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {[0, 1, 2].map((i) => (
          <FieldSet key={i}>
            <FieldLegend variant="label">Referencia {i + 1}</FieldLegend>
            <TextField
              form={form}
              name={`references.${i}.fullName`}
              label={`Nombre de la referencia ${i + 1}`}
              autoComplete="off"
            />
            <TextField
              form={form}
              name={`references.${i}.phone`}
              label={`Teléfono de la referencia ${i + 1}`}
              type="tel"
              inputMode="numeric"
              autoComplete="off"
            />
          </FieldSet>
        ))}
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
          disabled={form.formState.isSubmitting || !form.formState.isDirty}
        >
          Guardar referencias
        </Button>
      </FieldGroup>
    </form>
  );
}
