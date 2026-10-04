"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { BazaarProposalForm, type ProposalPhoto } from "./bazaar-proposal-form";

/** An approved bazaar proposes changes to its public profile (FR-029). */
export function ProposeChangeSection({
  bazaarId,
  defaults,
  hasPendingChange,
}: {
  bazaarId: string;
  defaults: { name: string; brands: string[]; linkUrl: string; photos: ProposalPhoto[] };
  hasPendingChange: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button type="button" variant="outline" size="touch" className="w-full" onClick={() => setOpen(true)}>
        <PencilIcon aria-hidden />
        {hasPendingChange ? "Cambiar mi propuesta" : "Proponer cambios"}
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Proponer cambios</h3>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>
      {hasPendingChange ? (
        <p className="text-muted-foreground text-sm">
          Al enviar, este cambio reemplaza al que está en revisión.
        </p>
      ) : null}
      <BazaarProposalForm
        bazaarId={bazaarId}
        defaults={defaults}
        mode="change"
        onDone={() => setOpen(false)}
      />
    </div>
  );
}
