"use client";

import { CopyIcon, MessageCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DeliveryResult } from "@/lib/notifications/types";

type Props = {
  result: DeliveryResult;
  /** Short description shown above the buttons, e.g. "Avisa a Laura que llegó su paquete". */
  title?: string;
};

function messageFromUrl(url: string): string {
  return new URL(url).searchParams.get("text") ?? "";
}

/**
 * Opens WhatsApp with the prepared message (FR-018, FR-022, FR-051). On phones it opens
 * automatically; on computers the collector clicks the button. If WhatsApp does not open,
 * the message can be copied and sent by hand (spec, edge case "WhatsApp no disponible").
 */
export function OpenWhatsApp({
  result,
  title = "Avisa a la clienta por WhatsApp",
}: Props) {
  const opened = useRef(false);
  const [copied, setCopied] = useState(false);
  const url = result.kind === "open_url" ? result.url : null;

  useEffect(() => {
    if (!url || opened.current) return;
    opened.current = true;
    if (window.matchMedia("(pointer: coarse)").matches) {
      window.location.assign(url);
    }
  }, [url]);

  if (!url) {
    return (
      <p className="text-muted-foreground text-sm">
        El aviso se envió automáticamente.
      </p>
    );
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(messageFromUrl(url!));
      setCopied(true);
      toast.success("Mensaje copiado. Pégalo en WhatsApp.");
    } catch {
      toast.error(
        "No se pudo copiar. Mantén presionado el mensaje para copiarlo.",
      );
    }
  }

  return (
    <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
      <p className="font-medium">{title}</p>
      <Button asChild size="touch" className="w-full">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <MessageCircleIcon aria-hidden />
          Abrir WhatsApp
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        onClick={copyMessage}
      >
        <CopyIcon aria-hidden />
        {copied ? "Mensaje copiado" : "Copiar mensaje"}
      </Button>
      <p className="bg-background rounded-md p-3 text-sm whitespace-pre-line select-all">
        {messageFromUrl(url)}
      </p>
    </div>
  );
}
