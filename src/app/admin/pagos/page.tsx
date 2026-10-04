import type { Metadata } from "next";

import { PaymentReviewList } from "@/features/payments/components/payment-review-list";
import { listPendingPayments } from "@/features/payments/queries";

export const metadata: Metadata = { title: "Pagos por revisar" };

export default async function PaymentsPage() {
  const payments = await listPendingPayments();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pagos por revisar</h1>
      <PaymentReviewList
        payments={payments.map((payment) => ({
          id: payment.id,
          amountCents: payment.amount_cents,
          createdAt: payment.created_at,
          hasProof: Boolean(payment.proof_path),
          folio: payment.order?.folio ?? 0,
          customerName: payment.order?.customer?.full_name ?? "",
          customerCode: payment.order?.customer?.code ?? "",
        }))}
      />
    </div>
  );
}
