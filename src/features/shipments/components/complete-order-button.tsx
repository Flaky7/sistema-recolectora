"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { markOrderComplete } from "../actions";

/** FR-020: asks for confirmation when fewer packages than expected arrived. */
export function CompleteOrderButton({
  folio,
  onCompleted,
}: {
  folio: number;
  onCompleted: () => void;
}) {
  const [question, setQuestion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function complete(confirmIncomplete: boolean) {
    setSaving(true);
    const result = await markOrderComplete({ folio, confirmIncomplete });
    setSaving(false);
    if (!result.ok) {
      if (result.code === "INCOMPLETE_PACKAGES") {
        setQuestion(result.error);
        return;
      }
      toast.error(result.error);
      return;
    }
    setQuestion(null);
    toast.success(`Pedido #${folio} completo.`);
    onCompleted();
  }

  return (
    <>
      <Button type="button" size="touch" className="w-full" onClick={() => complete(false)} disabled={saving}>
        Marcar completo
      </Button>
      <AlertDialog open={question !== null} onOpenChange={(open) => !open && setQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Faltan paquetes</AlertDialogTitle>
            <AlertDialogDescription>{question}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Volver</AlertDialogCancel>
            <Button type="button" size="lg" onClick={() => complete(true)} disabled={saving}>
              Sí, marcar completo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
