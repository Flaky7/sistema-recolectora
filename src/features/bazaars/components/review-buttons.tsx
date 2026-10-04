"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

import { reviewBazaar, reviewBazaarDocument, reviewBazaarProposal } from "../actions";

type Decide = (decision: "approve" | "reject", reason?: string) => Promise<ActionResult<unknown>>;

/** Approve / reject-with-reason pair used for bazaars, proposals and documents. */
function ApproveReject({
  decide,
  approveLabel,
  rejectTitle,
  rejectDescription,
  successApprove,
  successReject,
}: {
  decide: Decide;
  approveLabel: string;
  rejectTitle: string;
  rejectDescription: string;
  successApprove: string;
  successReject: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    const result = await decide("approve");
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(successApprove);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <ReasonDialog
        trigger={
          <Button type="button" variant="destructive" size="touch" disabled={busy}>
            <XIcon aria-hidden />
            Rechazar
          </Button>
        }
        title={rejectTitle}
        description={rejectDescription}
        reasonLabel="Motivo del rechazo"
        confirmLabel="Rechazar"
        onConfirm={async (reason) => {
          const result = await decide("reject", reason);
          if (!result.ok) return result.error;
          toast.success(successReject);
          router.refresh();
          return null;
        }}
      />
      <Button type="button" size="touch" onClick={approve} disabled={busy}>
        <CheckIcon aria-hidden />
        {busy ? "Guardando…" : approveLabel}
      </Button>
    </div>
  );
}

export function BazaarRegistrationButtons({ bazaarId }: { bazaarId: string }) {
  return (
    <ApproveReject
      decide={(decision, reason) => reviewBazaar({ bazaarId, decision, reason })}
      approveLabel="Aprobar"
      rejectTitle="Rechazar registro"
      rejectDescription="El bazar verá el motivo y podrá corregir y reenviar su registro."
      successApprove="Bazar aprobado: ya aparece en el directorio."
      successReject="Registro rechazado."
    />
  );
}

export function ProposalButtons({ proposalId }: { proposalId: string }) {
  return (
    <ApproveReject
      decide={(decision, reason) => reviewBazaarProposal({ id: proposalId, decision, reason })}
      approveLabel="Autorizar"
      rejectTitle="Rechazar cambio"
      rejectDescription="El directorio no cambia y el bazar verá el motivo."
      successApprove="Cambio autorizado y publicado."
      successReject="Cambio rechazado."
    />
  );
}

export function DocumentButtons({ documentId }: { documentId: string }) {
  return (
    <ApproveReject
      decide={(decision, reason) => reviewBazaarDocument({ id: documentId, decision, reason })}
      approveLabel="Autorizar"
      rejectTitle="Rechazar documento"
      rejectDescription="El documento vigente se conserva; el nuevo se borra y el bazar verá el motivo."
      successApprove="Documento autorizado. El anterior se borró."
      successReject="Documento rechazado."
    />
  );
}

/** Suspend (with reason) an approved bazaar, or reactivate a suspended one (FR-027, FR-049). */
export function SuspendButtons({
  bazaarId,
  status,
}: {
  bazaarId: string;
  status: "approved" | "suspended";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status === "suspended") {
    return (
      <Button
        type="button"
        size="touch"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await reviewBazaar({ bazaarId, decision: "reactivate" });
          setBusy(false);
          if (!result.ok) return void toast.error(result.error);
          toast.success("Bazar reactivado.");
          router.refresh();
        }}
      >
        Reactivar
      </Button>
    );
  }
  return (
    <ReasonDialog
      trigger={
        <Button type="button" variant="destructive" size="touch" className="w-full">
          Suspender
        </Button>
      }
      title="Suspender bazar"
      description="Dejará de aparecer en el directorio y no podrá editar su ficha ni subir documentos."
      reasonLabel="Motivo de la suspensión"
      confirmLabel="Suspender"
      onConfirm={async (reason) => {
        const result = await reviewBazaar({ bazaarId, decision: "suspend", reason });
        if (!result.ok) return result.error;
        toast.success("Bazar suspendido.");
        router.refresh();
        return null;
      }}
    />
  );
}
