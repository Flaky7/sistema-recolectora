"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FileUpload } from "@/components/file-upload";
import { TextAreaField, TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { recordConfirmedPayment } from "@/features/payments/actions";
import { applyActionErrors } from "@/lib/forms";
import { formatMoney, toCents } from "@/lib/format";
import { BUCKETS } from "@/lib/uploads/paths";

import { createOrder, createOrderForCustomer, updateOrder } from "../actions";
import { createOrderSchema, type CreateOrderInput } from "../schemas";
import { BazaarPicker, type PickedBazaar } from "./bazaar-picker";

type PaymentInfo = { initial_deposit_cents: number; payment_instructions: string };

type Props =
  | {
      /** The customer registers her own order, with the deposit proof (FR-009, FR-010). */
      mode: "create";
      customerId: string;
      paymentInfo: PaymentInfo | null;
    }
  | {
      /** The collector registers an order for a customer, optionally recording the deposit. */
      mode: "create-for-customer";
      customerId: string;
      paymentInfo: PaymentInfo | null;
    }
  | {
      mode: "edit";
      folio: number;
      defaults: { bazaars: PickedBazaar[]; description: string; expectedPackages: number };
      redirectTo: string;
    };

export function OrderForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [recordPayment, setRecordPayment] = useState(false);
  const [amount, setAmount] = useState(
    props.mode !== "edit" && props.paymentInfo
      ? String(props.paymentInfo.initial_deposit_cents / 100)
      : "",
  );
  const [paymentProof, setPaymentProof] = useState<string | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues:
      props.mode === "edit"
        ? props.defaults
        : { bazaars: [], description: "", expectedPackages: 1, proofPath: undefined },
  });

  async function onSubmit(values: CreateOrderInput) {
    setError(null);

    if (props.mode === "edit") {
      const result = await updateOrder({ ...values, folio: props.folio });
      if (!result.ok) return setError(applyActionErrors(result, form.setError));
      toast.success("Pedido actualizado.");
      router.push(props.redirectTo);
      router.refresh();
      return;
    }

    if (props.mode === "create") {
      const result = await createOrder(values);
      if (!result.ok) return setError(applyActionErrors(result, form.setError));
      if (values.proofPath && !result.data.proofSaved) {
        toast.warning("El pedido se guardó, pero el comprobante no. Súbelo de nuevo desde el pedido.");
      } else {
        toast.success(`Pedido #${result.data.folio} registrado.`);
      }
      router.push(`/mi-cuenta/pedidos/${result.data.folio}`);
      router.refresh();
      return;
    }

    const amountCents = recordPayment ? toCents(amount) : null;
    if (recordPayment && !amountCents) {
      return setError("Escribe el monto del pago recibido.");
    }
    const result = await createOrderForCustomer({
      customerId: props.customerId,
      bazaars: values.bazaars,
      description: values.description,
      expectedPackages: values.expectedPackages,
    });
    if (!result.ok) return setError(applyActionErrors(result, form.setError));

    if (recordPayment && amountCents) {
      const payment = await recordConfirmedPayment({
        folio: result.data.folio,
        amountCents,
        proofPath: paymentProof ?? undefined,
      });
      if (!payment.ok) {
        toast.warning(`Pedido #${result.data.folio} registrado, pero el pago no: ${payment.error}`);
      } else {
        toast.success(`Pedido #${result.data.folio} registrado con el pago confirmado.`);
      }
    } else {
      toast.success(`Pedido #${result.data.folio} registrado.`);
    }
    router.push(`/admin/pedidos/${result.data.folio}`);
    router.refresh();
  }

  const paymentInfo = props.mode === "edit" ? null : props.paymentInfo;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          control={form.control}
          name="bazaars"
          render={({ field, fieldState }) => (
            <BazaarPicker
              value={(field.value ?? []) as PickedBazaar[]}
              onChange={field.onChange}
              error={fieldState.error?.message ?? fieldState.error?.root?.message}
            />
          )}
        />
        <TextAreaField
          form={form}
          name="description"
          label="¿Qué compraste?"
          rows={3}
          placeholder="Por ejemplo: 2 blusas talla M y un pantalón negro"
        />
        <TextField
          form={form}
          name="expectedPackages"
          label="¿Cuántos paquetes esperas?"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          registerOptions={{ valueAsNumber: true }}
        />

        {props.mode === "create" ? (
          <section className="bg-muted/50 space-y-3 rounded-xl border p-4">
            <h2 className="font-semibold">Pago inicial</h2>
            {paymentInfo ? (
              <>
                <p className="text-2xl font-semibold">{formatMoney(paymentInfo.initial_deposit_cents)}</p>
                <p className="text-sm whitespace-pre-line">{paymentInfo.payment_instructions}</p>
              </>
            ) : null}
            <Controller
              control={form.control}
              name="proofPath"
              render={({ field }) => (
                <FileUpload
                  bucket={BUCKETS.paymentProofs}
                  folder={props.customerId}
                  kind="document"
                  label="Subir comprobante (foto o PDF)"
                  value={field.value ?? null}
                  onChange={(path) => field.onChange(path ?? undefined)}
                />
              )}
            />
            <p className="text-muted-foreground text-sm">
              Puedes registrar el pedido sin comprobante y subirlo después; el pedido avanza cuando
              la recolectora confirme tu pago.
            </p>
          </section>
        ) : null}

        {props.mode === "create-for-customer" ? (
          <section className="space-y-3 rounded-xl border p-4">
            <Field orientation="horizontal">
              <Checkbox
                id="record-payment"
                checked={recordPayment}
                onCheckedChange={(checked) => setRecordPayment(checked === true)}
              />
              <FieldLabel htmlFor="record-payment">Anotar pago inicial recibido</FieldLabel>
            </Field>
            {recordPayment ? (
              <>
                <Field>
                  <FieldLabel htmlFor="payment-amount">Monto recibido (pesos)</FieldLabel>
                  <Input
                    id="payment-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </Field>
                <FileUpload
                  bucket={BUCKETS.paymentProofs}
                  folder={props.customerId}
                  kind="document"
                  label="Comprobante (opcional)"
                  value={paymentProof}
                  onChange={setPaymentProof}
                />
              </>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="touch" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "Guardando…"
            : props.mode === "edit"
              ? "Guardar cambios"
              : "Registrar pedido"}
        </Button>
      </FieldGroup>
    </form>
  );
}
