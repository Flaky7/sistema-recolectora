import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMyCustomer } from "@/features/customers/queries";
import { OrderForm } from "@/features/orders/components/order-form";
import { getPaymentInfo } from "@/features/payments/queries";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default async function NewOrderPage() {
  const [customer, paymentInfo] = await Promise.all([
    getMyCustomer(),
    getPaymentInfo(),
  ]);
  if (!customer) notFound();

  if (customer.status !== "active") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nuevo pedido</h1>
        <p className="bg-destructive/10 text-destructive rounded-lg p-4">
          Tu cuenta está dada de baja temporalmente; no puedes registrar
          pedidos. Contacta a la recolectora.
        </p>
        <Link href="/mi-cuenta" className="text-primary underline">
          Volver a mi cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Nuevo pedido</h1>
        <p className="text-muted-foreground">
          Registra lo que compraste para que podamos recibir tus paquetes.
        </p>
      </div>
      <OrderForm
        mode="create"
        customerId={customer.id}
        paymentInfo={paymentInfo}
      />
    </div>
  );
}
