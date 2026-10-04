"use client";

import { CheckCircle2Icon, ClockIcon, Loader2Icon, UploadIcon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { BUCKETS } from "@/lib/uploads/paths";
import { uploadFile, UploadError } from "@/lib/uploads/upload";

import { setBazaarDocument } from "../actions";
import { DOCUMENT_TYPE_LABELS, type BazaarDocumentType } from "../labels";
import type { DocumentSlot } from "../queries";

/**
 * The 4 private documents (FR-024, FR-032 to FR-034). The bazaar sees the date of the current
 * one and the state of the new one, never the files. A new upload stays under review.
 */
export function BazaarDocumentsForm({
  bazaarId,
  slots,
  disabled,
}: {
  bazaarId: string;
  slots: DocumentSlot[];
  disabled?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {slots.map((slot) => (
        <DocumentRow key={slot.type} bazaarId={bazaarId} slot={slot} disabled={disabled} />
      ))}
    </ul>
  );
}

function DocumentRow({
  bazaarId,
  slot,
  disabled,
}: {
  bazaarId: string;
  slot: DocumentSlot;
  disabled?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const label = DOCUMENT_TYPE_LABELS[slot.type];

  async function upload(file: File | undefined, type: BazaarDocumentType) {
    if (!file) return;
    setBusy(true);
    try {
      const documentPath = await uploadFile(file, {
        bucket: BUCKETS.bazaarDocuments,
        folder: bazaarId,
        kind: "document",
        prefix: type,
      });
      const result = await setBazaarDocument({ type, documentPath });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label}: enviado a revisión.`);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof UploadError ? cause.message : "No se pudo subir el archivo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const hasAny = Boolean(slot.current || slot.latest);

  return (
    <li className="space-y-2 rounded-xl border p-3" data-testid={`document-${slot.type}`}>
      <p className="font-medium">{label}</p>
      {slot.current ? (
        <p className="flex items-center gap-1 text-sm">
          <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />
          Vigente desde {formatDate(slot.current.since)}
        </p>
      ) : null}
      {slot.latest?.status === "pending" ? (
        <p className="flex items-center gap-1 text-sm">
          <ClockIcon className="size-4 text-amber-600" aria-hidden />
          Nuevo documento: En revisión (enviado el {formatDate(slot.latest.at)})
        </p>
      ) : null}
      {slot.latest?.status === "rejected" ? (
        <p className="text-destructive flex items-start gap-1 text-sm">
          <XCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Rechazado: {slot.latest.reason}
        </p>
      ) : null}
      {!hasAny ? <p className="text-muted-foreground text-sm">Falta subirlo.</p> : null}
      {slot.current ? (
        <p className="text-muted-foreground text-xs">
          El documento actual sigue vigente hasta que la recolectora autorice el nuevo.
        </p>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        aria-label={`Archivo: ${label}`}
        disabled={disabled || busy}
        onChange={(e) => upload(e.target.files?.[0], slot.type)}
      />
      <Button
        type="button"
        variant={hasAny ? "outline" : "secondary"}
        size="touch"
        className="w-full"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : <UploadIcon aria-hidden />}
        {busy ? "Subiendo…" : hasAny ? "Actualizar documento" : "Subir documento"}
      </Button>
    </li>
  );
}
