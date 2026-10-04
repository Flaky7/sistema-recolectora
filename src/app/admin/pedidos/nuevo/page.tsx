import { SearchIcon, UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CUSTOMER_TYPE_LABELS } from "@/features/customers/labels";
import { getCustomerByCode, listCustomers } from "@/features/customers/queries";
import { OrderForm } from "@/features/orders/components/order-form";
import { getPaymentInfo } from "@/features/payments/queries";

export const metadata: Metadata = { title: "Nuevo pedido" };

/** FR-042, FR-043: an order for any customer, with an optional recorded deposit. */
export default async function AdminNewOrderPage({
  searchParams,
}: PageProps<"/admin/pedidos/nuevo">) {
  const params = await searchParams;
  const code = typeof params.clienta === "string" ? params.clienta : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const customer = code ? await getCustomerByCode(code) : null;

  if (customer && customer.status !== "deleted") {
    const paymentInfo = await getPaymentInfo();
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Nuevo pedido</h1>
          <p>
            Para <strong>{customer.full_name}</strong> ·{" "}
            <span className="font-mono">{customer.code}</span> · {CUSTOMER_TYPE_LABELS[customer.type]}
          </p>
          <Link href="/admin/pedidos/nuevo" className="text-primary text-sm underline">
            Cambiar clienta
          </Link>
        </div>
        <OrderForm mode="create-for-customer" customerId={customer.id} paymentInfo={paymentInfo} />
      </div>
    );
  }

  const results = q ? await listCustomers({ q, status: "active" }) : [];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo pedido</h1>
      <form className="flex gap-2" action="/admin/pedidos/nuevo">
        <label htmlFor="customer-search" className="sr-only">
          Buscar clienta
        </label>
        <Input
          id="customer-search"
          name="q"
          defaultValue={q}
          placeholder="Código, nombre o WhatsApp"
          autoComplete="off"
          autoCapitalize="characters"
        />
        <Button type="submit" size="touch">
          <SearchIcon aria-hidden />
          Buscar
        </Button>
      </form>

      {code && !customer ? (
        <p role="alert" className="text-destructive">
          No existe una clienta con el código {code}.
        </p>
      ) : null}

      {q ? (
        results.length === 0 ? (
          <p className="text-muted-foreground">No encontramos clientas activas con “{q}”.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {results.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/pedidos/nuevo?clienta=${c.code}`}
                  className="hover:bg-muted/50 flex min-h-11 items-center justify-between gap-2 p-3"
                >
                  <span>
                    <span className="font-medium">{c.full_name}</span>
                    {c.profile_id ? null : (
                      <span className="text-muted-foreground text-sm"> (sin cuenta)</span>
                    )}
                  </span>
                  <span className="font-mono">{c.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <Button asChild variant="outline" size="touch" className="w-full">
        <Link href="/admin/clientas/nueva">
          <UserPlusIcon aria-hidden />
          Dar de alta clienta sin cuenta
        </Link>
      </Button>
    </div>
  );
}
