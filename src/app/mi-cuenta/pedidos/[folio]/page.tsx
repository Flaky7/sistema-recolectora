import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMyCustomer } from "@/features/customers/queries";
import { CancelOrderButton } from "@/features/orders/components/cancel-order-button";
import { EditOrderSection } from "@/features/orders/components/edit-order-section";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { SubmitProofForm } from "@/features/orders/components/submit-proof-form";
import { ORDER_STATUS_HINTS } from "@/features/orders/labels";
import { getOrderByFolio } from "@/features/orders/queries";
import { isEditableOrder } from "@/features/orders/status";
import { PAYMENT_STATUS_LABELS } from "@/features/payments/labels";
import { formatDateTime, formatMoney } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/mi-cuenta/pedidos/[folio]">): Promise<Metadata> {
  const { folio } = await params;
  return { title: `Pedido #${folio}` };
}

export default async function CustomerOrderPage({
  params,
}: PageProps<"/mi-cuenta/pedidos/[folio]">) {
  const { folio: folioParam } = await params;
  const [order, customer] = await Promise.all([
    getOrderByFolio(Number(folioParam)),
    getMyCustomer(),
  ]);
  // RLS hides other customers' orders: they look exactly like a folio that does not exist.
  if (!order || !customer) notFound();

  const active = customer.status === "active";
  const status = order.status;
  const lastPayment = order.payments.at(-1);
  const hasConfirmedPayment = order.payments.some((p) => p.status === "confirmed");
  const canEdit = active && isEditableOrder(status);
  const canUploadProof = active && status === "registered";
  const canCancel =
    active &&
    (status === "registered" || status === "payment_pending") &&
    !hasConfirmedPayment &&
    order.packages.length === 0;

  return (
    <div className="space-y-6">
      <Link href="/mi-cuenta" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Mis pedidos
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Pedido #{order.folio}</h1>
          <OrderStatusBadge status={status} />
        </div>
        <p className="text-muted-foreground">{ORDER_STATUS_HINTS[status]}</p>
        <p className="text-lg font-medium">
          {order.received_packages} de {order.expected_packages} paquetes recibidos
        </p>
      </header>

      {lastPayment?.status === "rejected" && status === "registered" ? (
        <div role="alert" className="bg-destructive/10 text-destructive space-y-1 rounded-lg p-4">
          <p className="font-medium">No pudimos confirmar tu pago.</p>
          <p>Motivo: {lastPayment.rejection_reason}</p>
          <p>Sube un nuevo comprobante para que tu pedido avance.</p>
        </div>
      ) : null}

      {canUploadProof ? (
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Comprobante del pago inicial</h2>
          <SubmitProofForm folio={order.folio} customerId={customer.id} />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Detalle</h2>
        <dl className="grid gap-3 rounded-xl border p-4">
          <div>
            <dt className="text-muted-foreground text-sm">Bazares</dt>
            <dd>{order.bazaars.map((b) => b.name).join(", ")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Artículos</dt>
            <dd className="whitespace-pre-line">{order.description}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Registrado</dt>
            <dd>{formatDateTime(order.created_at!)}</dd>
          </div>
        </dl>
      </section>

      {order.payments.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Pagos</h2>
          <ul className="divide-y rounded-xl border">
            {order.payments.map((payment) => (
              <li key={payment.id} className="space-y-1 p-4">
                <p className="flex justify-between gap-2">
                  <span>{formatMoney(payment.amount_cents)}</span>
                  <span className="font-medium">{PAYMENT_STATUS_LABELS[payment.status]}</span>
                </p>
                <p className="text-muted-foreground text-sm">{formatDateTime(payment.created_at)}</p>
                {payment.rejection_reason ? (
                  <p className="text-sm">Motivo: {payment.rejection_reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Historial</h2>
        <OrderTimeline history={order.history} />
      </section>

      {canEdit || canCancel ? (
        <section className="space-y-3">
          {canEdit ? (
            <EditOrderSection
              folio={order.folio}
              redirectTo={`/mi-cuenta/pedidos/${order.folio}`}
              defaults={{
                bazaars: order.bazaars.map((b) => ({
                  bazaarId: b.bazaarId ?? undefined,
                  bazaarName: b.name,
                })),
                description: order.description ?? "",
                expectedPackages: order.expected_packages ?? 1,
              }}
            />
          ) : null}
          {canCancel ? <CancelOrderButton folio={order.folio} /> : null}
        </section>
      ) : null}
    </div>
  );
}
