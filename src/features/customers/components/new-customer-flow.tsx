"use client";

import { MessageCircleIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/notifications/whatsapp-link";

import type { Customer } from "../actions";
import { CustomerForm } from "./customer-form";

function codeMessage(customer: Customer) {
  return [
    `¡Hola ${customer.full_name}! Tu código de clienta es ${customer.code}.`,
    `Pide a cada bazar que lo escriba en la etiqueta de tus paquetes: ${customer.code} – ${customer.full_name}.`,
  ].join("\n");
}

/** FR-041: after saving, shows the code and a button to share it by WhatsApp. */
export function NewCustomerFlow() {
  const [created, setCreated] = useState<Customer | null>(null);

  if (created) {
    return (
      <div className="space-y-4">
        <div className="bg-primary text-primary-foreground space-y-2 rounded-2xl p-5">
          <p className="text-sm opacity-90">Código de {created.full_name}</p>
          <p className="font-mono text-5xl font-bold tracking-[0.3em]">
            {created.code}
          </p>
        </div>
        {created.whatsapp ? (
          <Button asChild size="touch" className="w-full">
            <a
              href={buildWhatsAppUrl(created.whatsapp, codeMessage(created))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircleIcon aria-hidden />
              Compartir código por WhatsApp
            </a>
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="touch">
            <Link href={`/admin/pedidos/nuevo?clienta=${created.code}`}>
              <PlusIcon aria-hidden />
              Registrar pedido
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={() => setCreated(null)}
          >
            Dar de alta otra
          </Button>
        </div>
      </div>
    );
  }

  return <CustomerForm onCreated={setCreated} />;
}
