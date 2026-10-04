"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";

import { resetClaimAttempts, setCustomerActive } from "../actions";

/** FR-049: temporary deactivation and reactivation; unlocking a blocked claim (research R22). */
export function CustomerStatusActions({
  customerId,
  status,
  claimLocked,
}: {
  customerId: string;
  status: "active" | "deactivated";
  claimLocked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reactivate() {
    setBusy(true);
    const result = await setCustomerActive({ customerId, active: true });
    setBusy(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Clienta reactivada.");
    router.refresh();
  }

  async function unlock() {
    setBusy(true);
    const result = await resetClaimAttempts(customerId);
    setBusy(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Listo: ya puede registrarse con su código.");
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      {status === "active" ? (
        <ReasonDialog
          trigger={
            <Button type="button" variant="outline" size="touch" className="w-full">
              Dar de baja temporal
            </Button>
          }
          title="Dar de baja temporal"
          description="Podrá ver sus pedidos, pero no crear ni modificar ninguno hasta que la reactives."
          reasonLabel="Nota (opcional)"
          reasonRequired={false}
          destructive={false}
          confirmLabel="Dar de baja"
          onConfirm={async () => {
            const result = await setCustomerActive({ customerId, active: false });
            if (!result.ok) return result.error;
            toast.success("Clienta dada de baja temporal.");
            router.refresh();
            return null;
          }}
        />
      ) : (
        <Button type="button" size="touch" className="w-full" onClick={reactivate} disabled={busy}>
          Reactivar
        </Button>
      )}
      {claimLocked ? (
        <Button type="button" variant="outline" size="touch" className="w-full" onClick={unlock} disabled={busy}>
          Desbloquear registro con su código
        </Button>
      ) : null}
    </div>
  );
}
