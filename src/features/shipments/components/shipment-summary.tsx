import { formatDateTime, formatMoney } from "@/lib/format";

import { SHIPMENT_TYPE_LABELS, type ShipmentType } from "../labels";

export type ShipmentSummaryData = {
  type: ShipmentType;
  carrier: string | null;
  tracking_number: string | null;
  cost_cents: number;
  shipped_at: string;
  delivered_at: string | null;
};

/** Type, carrier, tracking number and cost, shown to the customer and the collector (FR-023). */
export function ShipmentSummary({ shipment }: { shipment: ShipmentSummaryData }) {
  return (
    <dl className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground text-sm">Tipo</dt>
        <dd>{SHIPMENT_TYPE_LABELS[shipment.type]}</dd>
      </div>
      {shipment.carrier ? (
        <div>
          <dt className="text-muted-foreground text-sm">Paquetería</dt>
          <dd>{shipment.carrier}</dd>
        </div>
      ) : null}
      {shipment.tracking_number ? (
        <div>
          <dt className="text-muted-foreground text-sm">Número de guía</dt>
          <dd className="font-mono select-all">{shipment.tracking_number}</dd>
        </div>
      ) : null}
      <div>
        <dt className="text-muted-foreground text-sm">Costo de envío</dt>
        <dd>{formatMoney(shipment.cost_cents)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-sm">Enviado</dt>
        <dd>{formatDateTime(shipment.shipped_at)}</dd>
      </div>
      {shipment.delivered_at ? (
        <div>
          <dt className="text-muted-foreground text-sm">Entregado</dt>
          <dd>{formatDateTime(shipment.delivered_at)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
