"use client";

import {
  Controller,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  CUSTOMER_TYPE_DESCRIPTIONS,
  CUSTOMER_TYPE_LABELS,
  type CustomerType,
} from "../labels";

const TYPES: CustomerType[] = ["local", "out_of_town"];

/** Local or out-of-town, as large tappable cards (constitution IV). */
export function CustomerTypeField<T extends FieldValues>({
  form,
  name,
  legend = "¿Dónde vives?",
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  legend?: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid}>
          <FieldLegend variant="label">{legend}</FieldLegend>
          <RadioGroup
            name={field.name}
            value={field.value ?? ""}
            onValueChange={field.onChange}
            aria-invalid={fieldState.invalid}
          >
            {TYPES.map((type) => (
              <FieldLabel key={type} htmlFor={`${name}-${type}`}>
                <Field orientation="horizontal" className="min-h-11">
                  <RadioGroupItem value={type} id={`${name}-${type}`} />
                  <FieldContent>
                    <FieldTitle>{CUSTOMER_TYPE_LABELS[type]}</FieldTitle>
                    <FieldDescription>{CUSTOMER_TYPE_DESCRIPTIONS[type]}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          <FieldError errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  );
}
