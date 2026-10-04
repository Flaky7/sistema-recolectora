"use client";

import type { ComponentProps, ReactNode } from "react";
import type {
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CommonProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: ReactNode;
  description?: ReactNode;
};

/** Label, input and error for a react-hook-form field (shadcn/ui Field). */
export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  ...inputProps
}: CommonProps<T> & Omit<ComponentProps<typeof Input>, "name" | "form">) {
  const error = form.formState.errors[name];
  const id = `field-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        {...inputProps}
        {...form.register(name)}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error as { message?: string } | undefined]} />
    </Field>
  );
}

export function TextAreaField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  ...inputProps
}: CommonProps<T> & Omit<ComponentProps<typeof Textarea>, "name" | "form">) {
  const error = form.formState.errors[name];
  const id = `field-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        aria-invalid={Boolean(error)}
        {...inputProps}
        {...form.register(name)}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error as { message?: string } | undefined]} />
    </Field>
  );
}
