import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { SHIPMENT_TYPE_LABELS, type ShipmentType } from "@/features/shipments/labels";
import { listShipments } from "@/features/shipments/queries";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Envíos" };

const TYPES = Object.keys(SHIPMENT_TYPE_LABELS) as ShipmentType[];

export default async function ShipmentsPage({ searchParams }: PageProps<"/admin/envios">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const type = TYPES.find((t) => t === params.tipo);
  const status =
    params.estado === "shipped" || params.estado === "delivered" ? params.estado : undefined;
  const shipments = await listShipments({ q, type, status });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Envíos</h1>
      <form action="/admin/envios" className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label htmlFor="shipments-q" className="sr-only">
          Buscar
        </label>
        <input
          id="shipments-q"
          name="q"
          defaultValue={q}
          placeholder="Clienta, código o número de guía"
          className="border-input h-11 w-full rounded-lg border bg-transparent px-3"
        />
        <label className="sr-only" htmlFor="shipments-type">
          Tipo
        </label>
        <select
          id="shipments-type"
          name="tipo"
          defaultValue={type ?? ""}
          className="border-input h-11 rounded-lg border bg-transparent px-2"
        >
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {SHIPMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="shipments-status">
          Estado
        </label>
        <select
          id="shipments-status"
          name="estado"
          defaultValue={status ?? ""}
          className="border-input h-11 rounded-lg border bg-transparent px-2"
        >
          <option value="">En camino y entregados</option>
          <option value="shipped">En camino</option>
          <option value="delivered">Entregados</option>
        </select>
        <Button type="submit" variant="outline" size="touch">
          Filtrar
        </Button>
      </form>

      {shipments.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
          No hay envíos con esos filtros.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shipments.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/pedidos/${s.order.folio}`}
                className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    Pedido #{s.order.folio} · {s.order.customer.full_name}{" "}
                    <span className="font-mono text-sm">{s.order.customer.code}</span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {SHIPMENT_TYPE_LABELS[s.type]}
                    {s.carrier ? ` · ${s.carrier}` : ""}
                    {s.tracking_number ? ` · ${s.tracking_number}` : ""} · {formatMoney(s.cost_cents)} ·{" "}
                    {formatDate(s.shipped_at)}
                  </p>
                </div>
                <OrderStatusBadge status={s.order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
