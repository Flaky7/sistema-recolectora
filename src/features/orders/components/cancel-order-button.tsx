"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";

import { cancelOrder } from "../actions";

export function CancelOrderButton({ folio }: { folio: number }) {
  const router = useRouter();
  return (
    <ReasonDialog
      trigger={
        <Button type="button" variant="destructive" size="touch" className="w-full">
          Cancelar pedido
        </Button>
      }
      title={`¿Cancelar el pedido #${folio}?`}
      description="Esta acción no se puede deshacer."
      reasonLabel="¿Por qué lo cancelas?"
      confirmLabel="Cancelar pedido"
      onConfirm={async (reason) => {
        const result = await cancelOrder({ folio, reason });
        if (!result.ok) return result.error;
        toast.success(`Pedido #${folio} cancelado.`);
        router.refresh();
        return null;
      }}
    />
  );
}
