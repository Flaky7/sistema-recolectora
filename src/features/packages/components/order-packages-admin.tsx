"use client";

import { RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { OpenWhatsApp } from "@/components/open-whatsapp";
import { Button } from "@/components/ui/button";
import { resendNotification } from "@/features/notifications/actions";
import { formatDateTime } from "@/lib/format";
import type {
  DeliveryResult,
  NotificationKind,
} from "@/lib/notifications/types";

import { assignPackage } from "../actions";
import { PackageGallery, type GalleryPackage } from "./package-gallery";

const KIND_LABELS: Record<NotificationKind, string> = {
  package_received: "Paquete recibido",
  package_unassigned: "Paquete sin pedido",
  payment_confirmed: "Pago confirmado",
  payment_rejected: "Pago rechazado",
  order_shipped: "Pedido enviado",
};

type Props = {
  customerId: string;
  packages: GalleryPackage[];
  /** Other open orders of the same customer a package can move to. */
  otherOrders: { id: string; folio: number }[];
  canMove: boolean;
  notifications: { id: string; kind: NotificationKind; created_at: string }[];
};

export function OrderPackagesAdmin({
  customerId,
  packages,
  otherOrders,
  canMove,
  notifications,
}: Props) {
  const router = useRouter();
  const [resent, setResent] = useState<DeliveryResult | null>(null);

  async function move(packageId: string, orderId: string) {
    const target = otherOrders.find((o) => o.id === orderId);
    const result = await assignPackage({ packageId, customerId, orderId });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Paquete movido al pedido #${target?.folio}.`);
    router.refresh();
  }

  async function resend(notificationId: string) {
    const result = await resendNotification(notificationId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setResent(result.data);
  }

  return (
    <div className="space-y-4">
      <PackageGallery
        packages={packages}
        renderActions={
          canMove && otherOrders.length > 0
            ? (pkg) => (
                <label className="block">
                  <span className="sr-only">Mover a otro pedido</span>
                  <select
                    className="border-input h-11 w-full rounded-lg border bg-transparent px-2"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value)
                        void move(pkg.id, event.target.value);
                    }}
                  >
                    <option value="">Mover a…</option>
                    {otherOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Pedido #{order.folio}
                      </option>
                    ))}
                  </select>
                </label>
              )
            : undefined
        }
      />

      {notifications.length > 0 ? (
        <details className="rounded-xl border p-3">
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Avisos enviados ({notifications.length})
          </summary>
          <ul className="mt-2 divide-y">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span>
                  <span className="block">{KIND_LABELS[n.kind]}</span>
                  <span className="text-muted-foreground text-sm">
                    {formatDateTime(n.created_at)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => resend(n.id)}
                >
                  <RotateCcwIcon aria-hidden />
                  Reenviar
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {resent ? (
        <OpenWhatsApp
          key={resent.kind === "open_url" ? resent.url : resent.providerId}
          result={resent}
          title="Reenvía el aviso por WhatsApp"
        />
      ) : null}
    </div>
  );
}
