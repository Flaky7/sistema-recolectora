import type { Database } from "@/lib/supabase/database.types";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En revisión",
  confirmed: "Confirmado",
  rejected: "Rechazado",
};

export const PAYMENT_CONCEPT_LABELS: Record<
  Database["public"]["Enums"]["payment_concept"],
  string
> = {
  initial_deposit: "Pago inicial",
};

export const PAYMENT_METHOD_LABELS: Record<
  Database["public"]["Enums"]["payment_method"],
  string
> = {
  manual_transfer: "Transferencia o depósito",
};
