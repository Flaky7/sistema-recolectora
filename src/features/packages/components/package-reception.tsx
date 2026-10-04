"use client";

import { ArrowLeftIcon, CheckCircle2Icon, PackagePlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { OpenWhatsApp } from "@/components/open-whatsapp";
import { Button } from "@/components/ui/button";

import {
  CustomerSearch,
  OrderChoice,
  type ReceptionTarget,
} from "./customer-search";
import { PackageForm, type SavedPackage } from "./package-form";

/**
 * /admin/paquetes/nuevo: code → order → photo → save → WhatsApp, in under a minute (SC-001).
 * The key resets the whole flow for the next package.
 */
export function PackageReception() {
  const [round, setRound] = useState(0);
  return <ReceptionRound key={round} onNext={() => setRound((r) => r + 1)} />;
}

function ReceptionRound({ onNext }: { onNext: () => void }) {
  const [target, setTarget] = useState<ReceptionTarget | null>(null);
  const [orderId, setOrderId] = useState<string | null | undefined>(null);
  const [saved, setSaved] = useState<SavedPackage | null>(null);

  if (saved) {
    const exceeded =
      saved.received !== null &&
      saved.expected !== null &&
      saved.received > saved.expected;
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl bg-emerald-100 p-4 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50"
        >
          <CheckCircle2Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Paquete guardado</p>
            {saved.folio ? (
              <p>
                Pedido #{saved.folio}: {saved.received} de {saved.expected}{" "}
                paquetes
              </p>
            ) : (
              <p>
                {target?.kind === "unidentified"
                  ? "Sin identificar"
                  : "Sin pedido"}
              </p>
            )}
          </div>
        </div>
        {exceeded ? (
          <p
            role="alert"
            className="rounded-lg bg-amber-100 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
          >
            Llegaron más paquetes de los esperados ({saved.received} de{" "}
            {saved.expected}). Revisa el pedido.
          </p>
        ) : null}
        {saved.notification ? (
          <OpenWhatsApp
            result={saved.notification}
            title="Avisa a la clienta por WhatsApp"
          />
        ) : null}
        <Button
          type="button"
          size="touch"
          className="h-14 w-full text-lg"
          onClick={onNext}
        >
          <PackagePlusIcon aria-hidden />
          Registrar otro paquete
        </Button>
        {saved.folio ? (
          <Button asChild variant="outline" size="touch" className="w-full">
            <Link href={`/admin/pedidos/${saved.folio}`}>
              Ver pedido #{saved.folio}
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (!target) {
    return (
      <CustomerSearch
        onSelect={(selected) => {
          setTarget(selected);
          setOrderId(selected.kind === "customer" ? selected.orderId : null);
        }}
      />
    );
  }

  const selectedOrder =
    target.kind === "customer"
      ? target.customer.activeOrders.find((order) => order.id === orderId)
      : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 rounded-xl border p-3">
        <div>
          {target.kind === "customer" ? (
            <>
              <p className="font-semibold">{target.customer.fullName}</p>
              <p className="font-mono">{target.customer.code}</p>
            </>
          ) : (
            <p className="font-semibold">Paquete sin identificar</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => setTarget(null)}
        >
          <ArrowLeftIcon aria-hidden />
          Cambiar
        </Button>
      </div>

      {target.kind === "customer" ? (
        <OrderChoice
          customer={target.customer}
          value={orderId}
          onChange={setOrderId}
        />
      ) : null}

      {selectedOrder ? (
        <p className="text-lg font-medium">
          Este será el paquete {selectedOrder.received_packages + 1} de{" "}
          {selectedOrder.expected_packages}
          {selectedOrder.received_packages + 1 > selectedOrder.expected_packages
            ? " (más de los esperados)"
            : ""}
        </p>
      ) : null}

      {orderId === undefined ? (
        <p className="text-muted-foreground">Elige el pedido para continuar.</p>
      ) : (
        <PackageForm
          customerId={target.kind === "customer" ? target.customer.id : null}
          orderId={orderId}
          onSaved={setSaved}
        />
      )}
    </div>
  );
}
