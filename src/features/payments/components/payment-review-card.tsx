"use client";

import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { OpenWhatsApp } from "@/components/open-whatsapp";
import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { DeliveryResult } from "@/lib/notifications/types";

import { reviewPayment } from "../actions";
import { ViewProofButton } from "./view-proof-button";

export type PaymentReviewItem = {
  id: string;
  amountCents: number;
  createdAt: string;
  hasProof: boolean;
  folio: number;
  customerName: string;
  customerCode: string;
};

/**
 * One payment to review: open the proof, confirm or reject with a reason, then WhatsApp opens
 * with the message for the customer (FR-051).
 */
export function PaymentReviewCard({ payment }: { payment: PaymentReviewItem }) {
  const router = useRouter();
  const [done, setDone] = useState<{
    label: string;
    notification: DeliveryResult | null;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function decide(decision: "confirm" | "reject", reason?: string) {
    const result = await reviewPayment({
      paymentId: payment.id,
      decision,
      reason,
    });
    if (!result.ok) return result.error;
    const label = decision === "confirm" ? "Pago confirmado" : "Pago rechazado";
    toast.success(`${label}. Pedido #${payment.folio}.`);
    setDone({ label, notification: result.data.notification });
    router.refresh();
    return null;
  }

  async function confirm() {
    setConfirming(true);
    const error = await decide("confirm");
    setConfirming(false);
    if (error) toast.error(error);
  }

  return (
    <article className="space-y-3 rounded-xl border p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/admin/pedidos/${payment.folio}`}
            className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
          >
            Pedido #{payment.folio}
          </Link>
          <p className="text-sm">
            {payment.customerName} ·{" "}
            <span className="font-mono">{payment.customerCode}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            {formatDateTime(payment.createdAt)}
          </p>
        </div>
        <p className="text-lg font-semibold">
          {formatMoney(payment.amountCents)}
        </p>
      </header>

      {done ? (
        <div className="space-y-3">
          <p className="font-medium">{done.label}</p>
          {done.notification ? (
            <OpenWhatsApp
              result={done.notification}
              title="Avisa a la clienta por WhatsApp"
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-2">
          {payment.hasProof ? <ViewProofButton paymentId={payment.id} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <ReasonDialog
              trigger={
                <Button type="button" variant="destructive" size="touch">
                  <XIcon aria-hidden />
                  Rechazar
                </Button>
              }
              title={`Rechazar el pago del pedido #${payment.folio}`}
              description="La clienta verá el motivo y podrá subir otro comprobante."
              reasonLabel="Motivo del rechazo"
              confirmLabel="Rechazar pago"
              onConfirm={(reason) => decide("reject", reason)}
            />
            <Button
              type="button"
              size="touch"
              onClick={confirm}
              disabled={confirming}
            >
              <CheckIcon aria-hidden />
              {confirming ? "Confirmando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
