"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { PickedBazaar } from "./bazaar-picker";
import { OrderForm } from "./order-form";

/** Edit bazaars, description and expected packages while the order is not complete. */
export function EditOrderSection({
  folio,
  defaults,
  redirectTo,
}: {
  folio: number;
  defaults: { bazaars: PickedBazaar[]; description: string; expectedPackages: number };
  redirectTo: string;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <Button type="button" variant="outline" size="touch" className="w-full" onClick={() => setEditing(true)}>
        <PencilIcon aria-hidden />
        Editar pedido
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Editar pedido</h2>
        <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(false)}>
          Cerrar
        </Button>
      </div>
      <OrderForm mode="edit" folio={folio} defaults={defaults} redirectTo={redirectTo} />
    </div>
  );
}
