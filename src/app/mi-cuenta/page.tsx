import { ChevronRightIcon, PackageIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "@/features/account-deletion/components/delete-account-dialog";
import { CustomerCodeCard } from "@/features/customers/components/customer-code-card";
import { CustomerProfileForm } from "@/features/customers/components/customer-profile-form";
import { getMyCustomer } from "@/features/customers/queries";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { listMyOrders } from "@/features/orders/queries";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CustomerHomePage({ searchParams }: PageProps<"/mi-cuenta">) {
  const [customer, orders, params] = await Promise.all([
    getMyCustomer(),
    listMyOrders(),
    searchParams,
  ]);
  if (!customer) notFound();
  const active = customer.status === "active";

  return (
    <div className="space-y-8">
      {params.bienvenida ? (
        <p role="status" className="rounded-lg bg-emerald-100 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          ¡Listo! Tu cuenta está confirmada.
        </p>
      ) : null}

      {!active ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg p-4">
          Tu cuenta está dada de baja temporalmente. Puedes ver tus pedidos, pero no crear ni
          modificar ninguno. Contacta a la recolectora para reactivarla.
        </p>
      ) : null}

      <CustomerCodeCard code={customer.code} name={customer.full_name} />

      <section aria-labelledby="orders-title" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="orders-title" className="text-xl font-semibold">
            Mis pedidos
          </h2>
          {active ? (
            <Button asChild size="lg">
              <Link href="/mi-cuenta/pedidos/nuevo">
                <PlusIcon aria-hidden />
                Nuevo pedido
              </Link>
            </Button>
          ) : null}
        </div>

        {orders.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            <PackageIcon className="mx-auto mb-2 size-8" aria-hidden />
            <p>Aún no tienes pedidos. Registra uno cuando compres en un bazar.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/mi-cuenta/pedidos/${order.folio}`}
                  className="hover:bg-muted/50 flex items-center gap-3 p-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Pedido #{order.folio}</span>
                      <OrderStatusBadge status={order.status!} />
                    </div>
                    <p className="text-muted-foreground truncate text-sm">{order.description}</p>
                    <p className="text-muted-foreground text-sm">
                      {order.received_packages} de {order.expected_packages} paquetes ·{" "}
                      {formatDate(order.created_at!)}
                    </p>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground size-5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="profile-title" className="space-y-3">
        <h2 id="profile-title" className="text-xl font-semibold">
          Mis datos
        </h2>
        <p className="text-muted-foreground text-sm">
          {customer.full_name}. Si necesitas cambiar tu nombre, pídeselo a la recolectora.
        </p>
        <CustomerProfileForm
          disabled={!active}
          defaults={{
            whatsapp: customer.whatsapp ?? "",
            shippingAddress: customer.shipping_address ?? "",
            type: customer.type,
          }}
        />
      </section>

      <section aria-labelledby="delete-title" className="space-y-3 border-t pt-6">
        <h2 id="delete-title" className="text-xl font-semibold">
          Eliminar mi cuenta
        </h2>
        <p className="text-muted-foreground text-sm">
          Solo es posible si no tienes pedidos en curso (todos entregados o cancelados).
        </p>
        <DeleteAccountDialog
          target={{ kind: "self" }}
          triggerLabel="Eliminar mi cuenta"
          title="¿Eliminar tu cuenta?"
          deleted={<p>Tu cuenta de acceso, nombre, WhatsApp, dirección, correo, comprobantes de pago y fotos de tus paquetes.</p>}
          kept={<p>El historial de pedidos de la recolectora, como “Clienta eliminada”.</p>}
        />
      </section>
    </div>
  );
}
