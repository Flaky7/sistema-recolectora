"use client";

import { SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { submitBazaarForReview } from "../actions";

/** Sends (or resends after a rejection) the registration; shows what is missing if any. */
export function SubmitForReviewButton({ resubmit }: { resubmit: boolean }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);
    const result = await submitBazaarForReview();
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Registro enviado. La recolectora lo revisará.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg p-3"
        >
          No se pudo enviar. {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="touch"
        className="h-14 w-full text-lg"
        onClick={submit}
        disabled={sending}
      >
        <SendIcon aria-hidden />
        {sending
          ? "Enviando…"
          : resubmit
            ? "Reenviar a revisión"
            : "Enviar a revisión"}
      </Button>
    </div>
  );
}
