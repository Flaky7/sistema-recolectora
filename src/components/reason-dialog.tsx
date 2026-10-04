"use client";

import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/**
 * Confirmation that asks for a reason (rejecting, cancelling, suspending). `onConfirm`
 * returns an error message to keep the dialog open, or null when it succeeded.
 */
export function ReasonDialog({
  trigger,
  title,
  description,
  reasonLabel = "Motivo",
  confirmLabel,
  reasonRequired = true,
  destructive = true,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  reasonLabel?: string;
  confirmLabel: string;
  reasonRequired?: boolean;
  destructive?: boolean;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    const text = reason.trim();
    if (reasonRequired && text.length < 3) {
      setError("Escribe el motivo (al menos 3 caracteres).");
      return;
    }
    setSaving(true);
    setError(null);
    const failure = await onConfirm(text);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setReason("");
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="reason-dialog-text">{reasonLabel}</FieldLabel>
          <Textarea
            id="reason-dialog-text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            aria-invalid={Boolean(error)}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Volver</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            size="lg"
            onClick={confirm}
            disabled={saving}
          >
            {saving ? "Guardando…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
