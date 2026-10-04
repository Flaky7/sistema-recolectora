"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { BUCKETS } from "@/lib/uploads/paths";

import { submitPaymentProof } from "../actions";

/** Upload the deposit proof for an order saved without one, or after a rejection. */
export function SubmitProofForm({
  folio,
  customerId,
}: {
  folio: number;
  customerId: string;
}) {
  const router = useRouter();
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!proofPath) {
      setError("Primero sube el comprobante.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await submitPaymentProof({ folio, proofPath });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Comprobante enviado. La recolectora lo revisará.");
    setProofPath(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <FileUpload
        bucket={BUCKETS.paymentProofs}
        folder={customerId}
        kind="document"
        label="Subir comprobante (foto o PDF)"
        value={proofPath}
        onChange={setProofPath}
        error={error ?? undefined}
      />
      <Button
        type="button"
        size="touch"
        className="w-full"
        onClick={submit}
        disabled={saving || !proofPath}
      >
        {saving ? "Enviando…" : "Enviar comprobante"}
      </Button>
    </div>
  );
}
