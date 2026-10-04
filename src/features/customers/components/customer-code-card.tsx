"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * The customer code, big and easy to dictate (FR-007), with instructions to share it with
 * bazaars so they write it on each package label.
 */
export function CustomerCodeCard({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado.");
    } catch {
      toast.error("No se pudo copiar. Escríbelo a mano.");
    }
  }

  return (
    <section
      aria-labelledby="customer-code-title"
      className="bg-primary text-primary-foreground space-y-3 rounded-2xl p-5"
    >
      <h2 id="customer-code-title" className="text-sm font-medium opacity-90">
        Tu código de clienta
      </h2>
      <p className="font-mono text-5xl font-bold tracking-[0.3em]" aria-label={code.split("").join(" ")}>
        {code}
      </p>
      <p className="text-sm opacity-90">
        Pide a cada bazar que escriba en la etiqueta del paquete:{" "}
        <strong>
          {code} – {name}
        </strong>
        . Así sabremos que es tuyo cuando llegue.
      </p>
      <Button type="button" variant="secondary" size="touch" className="w-full" onClick={copy}>
        {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        {copied ? "Copiado" : "Copiar código"}
      </Button>
    </section>
  );
}
