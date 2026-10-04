import type { Metadata } from "next";

import { NewCustomerFlow } from "@/features/customers/components/new-customer-flow";

export const metadata: Metadata = { title: "Nueva clienta" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dar de alta clienta</h1>
        <p className="text-muted-foreground">
          Para clientas que no usan la app. Recibirán avisos por WhatsApp y
          pueden crear su cuenta después con el mismo número y su código.
        </p>
      </div>
      <NewCustomerFlow />
    </div>
  );
}
