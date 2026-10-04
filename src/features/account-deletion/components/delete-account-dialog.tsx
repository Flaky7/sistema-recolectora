"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

import { deleteBazaarData, deleteCustomerData, deleteMyAccount } from "../actions";

type Target =
  | { kind: "self" }
  | { kind: "customer"; customerId: string; redirectTo: string }
  | { kind: "bazaar"; bazaarId: string; redirectTo: string };

/**
 * Deleting is permanent: the dialog explains what is erased and what stays without personal
 * data, and requires typing ELIMINAR (FR-046, FR-047).
 */
export function DeleteAccountDialog({
  target,
  triggerLabel,
  title,
  deleted,
  kept,
}: {
  target: Target;
  triggerLabel: string;
  title: string;
  deleted: ReactNode;
  kept: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(null);
    let result: ActionResult<unknown>;
    if (target.kind === "self") {
      // Redirects to "/" when it succeeds.
      result = await deleteMyAccount({ confirmation: text });
    } else if (target.kind === "customer") {
      result = await deleteCustomerData({ customerId: target.customerId, confirmation: text });
    } else {
      result = await deleteBazaarData({ bazaarId: target.bazaarId, confirmation: text });
    }
    setBusy(false);
    if (!result.ok) {
      setError(result.fieldErrors?.confirmation?.[0] ?? result.error);
      return;
    }
    setOpen(false);
    toast.success("Datos eliminados.");
    if (target.kind !== "self") {
      router.push(target.redirectTo);
      router.refresh();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="touch" className="w-full">
          <Trash2Icon aria-hidden />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left">
              <div>
                <p className="font-medium">Se borra para siempre:</p>
                {deleted}
              </div>
              <div>
                <p className="font-medium">Se conserva, sin datos personales:</p>
                {kept}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="delete-confirmation">Escribe ELIMINAR para confirmar</FieldLabel>
          <Input
            id="delete-confirmation"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            aria-invalid={Boolean(error)}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Volver</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={confirm}
            disabled={busy || text.trim().toUpperCase() !== "ELIMINAR"}
          >
            {busy ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
