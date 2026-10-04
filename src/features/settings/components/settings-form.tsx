"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { TextAreaField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyActionErrors } from "@/lib/forms";
import { formatMoney, toCents } from "@/lib/format";
import {
  renderTemplate,
  TEMPLATE_VARIABLES,
} from "@/lib/notifications/messages";
import type { NotificationKind } from "@/lib/notifications/types";

import { updateSettings } from "../actions";
import {
  TEMPLATE_FIELDS,
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "../schemas";

/** Example values for the preview of each template. */
const SAMPLE = {
  nombre: "Laura",
  bazar: "Bazar Ñandú",
  recibidos: 2,
  esperados: 3,
  enlace: "https://recolectora.mx/mi-cuenta/pedidos/123",
  folio: 123,
  monto: formatMoney(15000),
  motivo: "El monto no coincide",
  tipo: "envío por paquetería",
  paqueteria: "Estafeta",
  guia: "EST123456789",
  costo: formatMoney(18900),
};

function Preview({
  form,
  name,
}: {
  form: ReturnType<typeof useForm<UpdateSettingsInput>>;
  name: keyof UpdateSettingsInput;
}) {
  const value = useWatch({ control: form.control, name });
  return (
    <div
      className="bg-muted rounded-lg p-3 text-sm whitespace-pre-line"
      aria-label="Vista previa"
    >
      {renderTemplate(String(value ?? ""), SAMPLE) || "—"}
    </div>
  );
}

export function SettingsForm({ defaults }: { defaults: UpdateSettingsInput }) {
  const [error, setError] = useState<string | null>(null);
  const [pesos, setPesos] = useState(
    String(defaults.initialDepositCents / 100),
  );
  const form = useForm<UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: UpdateSettingsInput) {
    setError(null);
    const result = await updateSettings(values);
    if (!result.ok) return setError(applyActionErrors(result, form.setError));
    form.reset(values);
    toast.success("Configuración guardada.");
  }

  const depositError = form.formState.errors.initialDepositCents?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pago inicial</h2>
          <Field data-invalid={Boolean(depositError)}>
            <FieldLabel htmlFor="deposit">
              Monto del pago inicial (pesos)
            </FieldLabel>
            <Input
              id="deposit"
              inputMode="decimal"
              value={pesos}
              aria-invalid={Boolean(depositError)}
              onChange={(e) => {
                setPesos(e.target.value);
                form.setValue(
                  "initialDepositCents",
                  toCents(e.target.value) ?? Number.NaN,
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />
            <FieldError>{depositError}</FieldError>
          </Field>
          <TextAreaField
            form={form}
            name="paymentInstructions"
            label="Datos para pagar (banco, CLABE, titular y concepto)"
            rows={4}
            description="Las clientas los ven al registrar un pedido."
          />
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Mensajes de WhatsApp</h2>
          <p className="text-muted-foreground text-sm">
            Una línea que usa una variable sin valor se omite (por ejemplo, el
            enlace para clientas sin cuenta).
          </p>
          {TEMPLATE_FIELDS.map((field) => (
            <div key={field.name} className="space-y-2">
              <TextAreaField
                form={form}
                name={field.name}
                label={field.label}
                rows={4}
                description={`Variables: ${TEMPLATE_VARIABLES[field.kind as NotificationKind].map((v) => `{${v}}`).join(" ")}`}
              />
              <Preview form={form} name={field.name} />
            </div>
          ))}
        </section>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting || !form.formState.isDirty}
        >
          {form.formState.isSubmitting ? "Guardando…" : "Guardar configuración"}
        </Button>
      </FieldGroup>
    </form>
  );
}
