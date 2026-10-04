"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { OpenWhatsApp } from "@/components/open-whatsapp";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/features/orders/status";
import type { DeliveryResult } from "@/lib/notifications/types";

import { markOrderDelivered } from "../actions";
import { CompleteOrderButton } from "./complete-order-button";
import { ShipmentForm } from "./shipment-form";

/**
 * Collector actions by status: Marcar completo (receiving), Registrar envío (complete),
 * Marcar entregado (shipped). Always rendered, so the WhatsApp message stays on screen after
 * the order moves to "Enviado".
 */
export function OrderShippingActions({
  folio,
  status,
  customerType,
}: {
  folio: number;
  status: OrderStatus;
  customerType: "local" | "out_of_town";
}) {
  const router = useRouter();
  const [notification, setNotification] = useState<DeliveryResult | null>(null);
  const [delivering, setDelivering] = useState(false);

  async function deliver() {
    setDelivering(true);
    const result = await markOrderDelivered({ folio });
    setDelivering(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Pedido #${folio} entregado.`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {notification ? (
        <OpenWhatsApp result={notification} title="Avisa a la clienta que su pedido va en camino" />
      ) : null}
      {status === "receiving" ? (
        <CompleteOrderButton folio={folio} onCompleted={() => router.refresh()} />
      ) : null}
      {status === "complete" ? (
        <section className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">Registrar envío</h3>
          <ShipmentForm
            folio={folio}
            customerType={customerType}
            onSaved={(result) => {
              toast.success(`Pedido #${folio} enviado.`);
              setNotification(result);
              router.refresh();
            }}
          />
        </section>
      ) : null}
      {status === "shipped" ? (
        <Button type="button" size="touch" className="w-full" onClick={deliver} disabled={delivering}>
          {delivering ? "Guardando…" : "Marcar entregado"}
        </Button>
      ) : null}
    </div>
  );
}
