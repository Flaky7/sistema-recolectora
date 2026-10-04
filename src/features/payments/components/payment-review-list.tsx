"use client";

import { useState } from "react";

import {
  PaymentReviewCard,
  type PaymentReviewItem,
} from "./payment-review-card";

/**
 * Keeps the list as it was when the page opened, so a payment just reviewed stays on screen
 * with its WhatsApp button after the server data refreshes.
 */
export function PaymentReviewList({
  payments,
}: {
  payments: PaymentReviewItem[];
}) {
  const [items] = useState(payments);
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
        No hay pagos por revisar.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((payment) => (
        <li key={payment.id}>
          <PaymentReviewCard payment={payment} />
        </li>
      ))}
    </ul>
  );
}
