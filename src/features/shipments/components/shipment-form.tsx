"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toCents } from "@/lib/format";
import type { DeliveryResult } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

import { registerShipment } from "../actions";
import {
  SHIPMENT_TYPE_LABELS,
  shipmentTypesFor,
  type ShipmentType,
} from "../labels";

/**
 * FR-021: out-of-town customers only get "Paquetería"; local ones also get delivery or pickup
 * in person. Cost is typed in pesos and stored in cents (informative, FR-023).
 */
export function ShipmentForm({
  folio,
  customerType,
  onSaved,
}: {
  folio: number;
  customerType: "local" | "out_of_town";
  onSaved: (notification: DeliveryResult | null) => void;
}) {
  const types = shipmentTypesFor(customerType);
  const [type, setType] = useState<ShipmentType>(types[0]!);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [cost, setCost] = useState("0");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setErrors({});
    const costCents = toCents(cost);
    if (costCents === null) {
      setErrors({
        costCents: ["Escribe el costo en pesos, por ejemplo 150 o 150.50."],
      });
      return;
    }
    setSaving(true);
    const result = await registerShipment(
      type === "carrier"
        ? { folio, type, carrier, trackingNumber: tracking, costCents }
        : { folio, type, costCents },
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.code === "VALIDATION" ? null : result.error);
      setErrors(result.fieldErrors ?? {});
      return;
    }
    onSaved(result.data.notification);
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-medium">Tipo de envío</legend>
        {types.map((option) => (
          <label
            key={option}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3",
              type === option && "border-primary bg-primary/5",
            )}
          >
            <input
              type="radio"
              name="shipment-type"
              className="size-5"
              checked={type === option}
              onChange={() => setType(option)}
            />
            {SHIPMENT_TYPE_LABELS[option]}
          </label>
        ))}
      </fieldset>

      {type === "carrier" ? (
        <>
          <Field data-invalid={Boolean(errors.carrier)}>
            <FieldLabel htmlFor="shipment-carrier">Paquetería</FieldLabel>
            <Input
              id="shipment-carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Estafeta, DHL, FedEx…"
              aria-invalid={Boolean(errors.carrier)}
            />
            <FieldError>{errors.carrier?.[0]}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.trackingNumber)}>
            <FieldLabel htmlFor="shipment-tracking">Número de guía</FieldLabel>
            <Input
              id="shipment-tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              aria-invalid={Boolean(errors.trackingNumber)}
            />
            <FieldError>{errors.trackingNumber?.[0]}</FieldError>
          </Field>
        </>
      ) : null}

      <Field data-invalid={Boolean(errors.costCents)}>
        <FieldLabel htmlFor="shipment-cost">Costo de envío (pesos)</FieldLabel>
        <Input
          id="shipment-cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          inputMode="decimal"
          aria-invalid={Boolean(errors.costCents)}
        />
        <FieldError>{errors.costCents?.[0]}</FieldError>
      </Field>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="touch"
        className="w-full"
        onClick={save}
        disabled={saving}
      >
        {saving ? "Guardando…" : "Registrar envío"}
      </Button>
    </div>
  );
}
