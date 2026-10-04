"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { OpenWhatsApp } from "@/components/open-whatsapp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DeliveryResult } from "@/lib/notifications/types";

import { assignPackage, findCustomerForPackage, type FoundCustomer } from "../actions";
import { CustomerSearch, OrderChoice } from "./customer-search";

/**
 * Assigns a package "sin identificar" to a customer, or a package "sin pedido" to one of her
 * orders (FR-017). WhatsApp opens with the message that corresponds (FR-018).
 */
export function AssignPackage({
  packageId,
  customerCode,
}: {
  packageId: string;
  /** Known customer of a package without order; null when unidentified. */
  customerCode: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<FoundCustomer | null>(null);
  const [orderId, setOrderId] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<DeliveryResult | null>(null);

  useEffect(() => {
    if (!open || !customerCode) return;
    findCustomerForPackage(customerCode).then((result) => {
      const found = result.ok ? result.data.find((c) => c.code === customerCode) : undefined;
      if (found) setCustomer(found);
    });
  }, [open, customerCode]);

  async function save() {
    if (!customer || orderId === undefined) return;
    setSaving(true);
    const result = await assignPackage({
      packageId,
      customerId: customer.id,
      orderId: orderId ?? undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.folio ? `Asignado al pedido #${result.data.folio}.` : "Paquete asignado.");
    if (result.data.notification) setNotification(result.data.notification);
    else setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="lg" className="w-full">
          Asignar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar paquete</DialogTitle>
          <DialogDescription>
            {customerCode ? "Elige el pedido de la clienta." : "Busca a la clienta y su pedido."}
          </DialogDescription>
        </DialogHeader>

        {notification ? (
          <OpenWhatsApp result={notification} />
        ) : !customer ? (
          customerCode ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : (
            <CustomerSearch
              onSelect={(target) => {
                if (target.kind !== "customer") return;
                setCustomer(target.customer);
                setOrderId(target.orderId);
              }}
            />
          )
        ) : (
          <div className="space-y-4">
            <p>
              <span className="font-semibold">{customer.fullName}</span> ·{" "}
              <span className="font-mono">{customer.code}</span>
            </p>
            <OrderChoice customer={customer} value={orderId} onChange={setOrderId} />
            <Button
              type="button"
              size="touch"
              className="w-full"
              onClick={save}
              disabled={saving || orderId === undefined || (Boolean(customerCode) && orderId === null)}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
