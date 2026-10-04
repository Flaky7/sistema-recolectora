import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { CustomerStatusActions } from "@/features/customers/components/customer-status-actions";
import { CUSTOMER_STATUS_LABELS } from "@/features/customers/labels";
import { getCustomerByCode } from "@/features/customers/queries";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { listOrders } from "@/features/orders/queries";
import { listPackages } from "@/features/packages/queries";
import { formatDate, formatDateTime } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/admin/clientas/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Clienta ${code}` };
}

export default async function CustomerDetailPage({ params }: PageProps<"/admin/clientas/[code]">) {
  const { code } = await params;
  const customer = await getCustomerByCode(code);
  if (!customer) notFound();
  const [orders, packages] = await Promise.all([
    listOrders({ customer: customer.code }),
    listPackages({ q: customer.code }),
  ]);
  const ownPackages = packages.filter((p) => p.customer_id === customer.id);
  const deleted = customer.status === "deleted";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/clientas" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Clientas
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{customer.full_name}</h1>
          <span className="font-mono text-xl">{customer.code}</span>
          {customer.status !== "active" ? (
            <Badge variant="secondary">{CUSTOMER_STATUS_LABELS[customer.status]}</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {customer.profile_id ? "Con cuenta" : "Sin cuenta"} · Alta {formatDate(customer.created_at)}
        </p>
      </header>

      {!deleted ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Datos</h2>
          <p className="text-muted-foreground text-sm">El código no se puede cambiar.</p>
          <CustomerForm
            customerId={customer.id}
            defaults={{
              fullName: customer.full_name,
              whatsapp: customer.whatsapp ?? "",
              shippingAddress: customer.shipping_address ?? "",
              type: customer.type,
            }}
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Pedidos ({orders.length})</h2>
          {customer.status === "active" ? (
            <Button asChild size="lg">
              <Link href={`/admin/pedidos/nuevo?clienta=${customer.code}`}>
                <PlusIcon aria-hidden />
                Nuevo pedido
              </Link>
            </Button>
          ) : null}
        </div>
        {orders.length === 0 ? (
          <p className="text-muted-foreground">Sin pedidos.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/pedidos/${order.folio}`} className="hover:bg-muted/50 flex items-center justify-between gap-2 p-3">
                  <span>
                    <span className="block font-medium">Pedido #{order.folio}</span>
                    <span className="text-muted-foreground text-sm">
                      {order.received_packages} de {order.expected_packages} paquetes · {formatDate(order.created_at!)}
                    </span>
                  </span>
                  <OrderStatusBadge status={order.status!} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Paquetes ({ownPackages.length})</h2>
        {ownPackages.length === 0 ? (
          <p className="text-muted-foreground">Sin paquetes.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {ownPackages.map((pkg) => (
              <li key={pkg.id} className="flex items-center justify-between gap-2 p-3">
                <span>
                  <span className="block">{pkg.bazaar_name ?? "Bazar desconocido"}</span>
                  <span className="text-muted-foreground text-sm">{formatDateTime(pkg.received_at)}</span>
                </span>
                <span className="text-sm">{pkg.order ? `Pedido #${pkg.order.folio}` : "Sin pedido"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!deleted ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Cuenta</h2>
          <CustomerStatusActions
            customerId={customer.id}
            status={customer.status as "active" | "deactivated"}
            claimLocked={!customer.profile_id && customer.claim_failed_attempts >= 10}
          />
        </section>
      ) : null}
    </div>
  );
}
