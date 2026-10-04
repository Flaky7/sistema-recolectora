import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListFilters } from "@/components/list-filters";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { ORDER_STATUS_LABELS } from "@/features/orders/labels";
import { listOrders } from "@/features/orders/queries";
import type { OrderStatus } from "@/features/orders/status";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos" };

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function param(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** FR-039: filter by status, customer (name or code) and bazaar. */
export default async function OrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.estado);
  const customer = param(params.clienta);
  const bazaar = param(params.bazar);
  const orders = await listOrders({ status, customer, bazaar });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Button asChild size="lg">
          <Link href="/admin/pedidos/nuevo">
            <PlusIcon aria-hidden />
            Nuevo
          </Link>
        </Button>
      </div>

      <ListFilters
        action="/admin/pedidos"
        texts={[
          { name: "clienta", label: "Clienta (nombre o código)", value: customer },
          { name: "bazar", label: "Bazar", value: bazaar },
        ]}
        selects={[
          {
            name: "estado",
            label: "Estado",
            value: status,
            allLabel: "Todos los estados",
            options: STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
          },
        ]}
      />

      <p className="text-muted-foreground text-sm" role="status">
        {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
      </p>

      {orders.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
          No hay pedidos con esos filtros.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border" aria-label="Pedidos">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/pedidos/${order.folio}`}
                className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    Pedido #{order.folio} · {order.customer_name}{" "}
                    <span className="font-mono text-sm">{order.customer_code}</span>
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {order.received_packages} de {order.expected_packages} paquetes ·{" "}
                    {formatDate(order.created_at!)} · {order.description}
                  </p>
                </div>
                <OrderStatusBadge status={order.status!} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
