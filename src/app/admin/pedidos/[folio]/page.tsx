import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CUSTOMER_TYPE_LABELS } from "@/features/customers/labels";
import { CancelOrderButton } from "@/features/orders/components/cancel-order-button";
import { EditOrderSection } from "@/features/orders/components/edit-order-section";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { getOrderByFolio } from "@/features/orders/queries";
import { OrderPackagesAdmin } from "@/features/packages/components/order-packages-admin";
import { listOrderNotifications } from "@/features/packages/queries";
import { isEditableOrder } from "@/features/orders/status";
import { PaymentReviewCard } from "@/features/payments/components/payment-review-card";
import { ViewProofButton } from "@/features/payments/components/view-proof-button";
import { OrderShippingActions } from "@/features/shipments/components/order-shipping-actions";
import { ShipmentSummary } from "@/features/shipments/components/shipment-summary";
import { PAYMENT_STATUS_LABELS } from "@/features/payments/labels";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/admin/pedidos/[folio]">): Promise<Metadata> {
  const { folio } = await params;
  return { title: `Pedido #${folio}` };
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[folio]">) {
  const { folio: folioParam } = await params;
  const order = await getOrderByFolio(Number(folioParam));
  if (!order) notFound();

  const supabase = await createClient();
  const [notifications, { data: otherOrders }] = await Promise.all([
    listOrderNotifications(order.id),
    supabase
      .from("orders")
      .select("id, folio")
      .eq("customer_id", order.customer_id!)
      .neq("id", order.id)
      .not("status", "in", "(shipped,delivered,cancelled)")
      .order("folio"),
  ]);

  const status = order.status;
  const canMovePackages = !["shipped", "delivered", "cancelled"].includes(status);
  const canCancel = !["shipped", "delivered", "cancelled"].includes(status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/pedidos" className="text-muted-foreground inline-flex min-h-11 items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Pedidos
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Pedido #{order.folio}</h1>
          <OrderStatusBadge status={status} />
        </div>
        <p>
          <Link href={`/admin/clientas/${order.customer_code}`} className="font-medium underline-offset-4 hover:underline">
            {order.customer_name}
          </Link>{" "}
          · <span className="font-mono">{order.customer_code}</span> ·{" "}
          {CUSTOMER_TYPE_LABELS[order.customer_type!]}
          {order.customer_has_account ? null : " · sin cuenta"}
        </p>
        <p className="text-lg font-medium">
          {order.received_packages} de {order.expected_packages} paquetes recibidos
        </p>
      </header>

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
          {order.cancelled_reason ? (
            <div>
              <dt className="text-muted-foreground text-sm">Motivo de cancelación</dt>
              <dd>{order.cancelled_reason}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <OrderShippingActions
        folio={order.folio}
        status={status}
        customerType={order.customer_type!}
      />

      {order.shipment ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Envío</h2>
          <ShipmentSummary shipment={order.shipment} />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Paquetes ({order.received_packages} de {order.expected_packages})
        </h2>
        <OrderPackagesAdmin
          customerId={order.customer_id!}
          packages={order.packages}
          otherOrders={otherOrders ?? []}
          canMove={canMovePackages}
          notifications={notifications}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Pagos</h2>
        {order.payments.length === 0 ? (
          <p className="text-muted-foreground">Sin pagos registrados.</p>
        ) : (
          <ul className="space-y-3">
            {order.payments.map((payment) =>
              payment.status === "pending" ? (
                <li key={payment.id}>
                  <PaymentReviewCard
                    payment={{
                      id: payment.id,
                      amountCents: payment.amount_cents,
                      createdAt: payment.created_at,
                      hasProof: Boolean(payment.proof_path),
                      folio: order.folio,
                      customerName: order.customer_name ?? "",
                      customerCode: order.customer_code ?? "",
                    }}
                  />
                </li>
              ) : (
                <li key={payment.id} className="space-y-2 rounded-xl border p-4">
                  <p className="flex justify-between gap-2">
                    <span>{formatMoney(payment.amount_cents)}</span>
                    <span className="font-medium">{PAYMENT_STATUS_LABELS[payment.status]}</span>
                  </p>
                  <p className="text-muted-foreground text-sm">{formatDateTime(payment.created_at)}</p>
                  {payment.rejection_reason ? (
                    <p className="text-sm">Motivo: {payment.rejection_reason}</p>
                  ) : null}
                  {payment.proof_path ? <ViewProofButton paymentId={payment.id} /> : null}
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Historial</h2>
        <OrderTimeline history={order.history} />
      </section>

      <section className="space-y-3">
        {isEditableOrder(status) ? (
          <EditOrderSection
            folio={order.folio}
            redirectTo={`/admin/pedidos/${order.folio}`}
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
    </div>
  );
}
