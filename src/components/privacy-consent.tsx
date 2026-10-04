"use client";

import Link from "next/link";
import {
  Controller,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

/** Required acceptance of the privacy notice in every sign-up (FR-005). */
export function PrivacyConsent<T extends FieldValues>({
  form,
  name,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
          <Checkbox
            id={`field-${name}`}
            checked={field.value === true}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            aria-invalid={fieldState.invalid}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <FieldLabel htmlFor={`field-${name}`} className="font-normal">
              <span>
                Leí y acepto el{" "}
                <Link
                  href="/aviso-de-privacidad"
                  target="_blank"
                  className="text-primary underline underline-offset-4"
                >
                  aviso de privacidad
                </Link>
                .
              </span>
            </FieldLabel>
            <FieldError errors={[fieldState.error]} />
          </div>
        </Field>
      )}
    />
  );
}
