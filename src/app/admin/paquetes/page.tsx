import { PackagePlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { PendingPackagesList } from "@/features/packages/components/pending-packages-list";
import { listPackages, type PackageFilter } from "@/features/packages/queries";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Paquetes" };

const TABS: { value: string; filter: PackageFilter; label: string }[] = [
  { value: "todos", filter: "all", label: "Todos" },
  { value: "sin-pedido", filter: "no_order", label: "Sin pedido" },
  {
    value: "sin-identificar",
    filter: "unidentified",
    label: "Sin identificar",
  },
];

export default async function PackagesPage({
  searchParams,
}: PageProps<"/admin/paquetes">) {
  const params = await searchParams;
  const tab = TABS.find((t) => t.value === params.filtro) ?? TABS[0]!;
  const q = typeof params.q === "string" ? params.q : "";
  const packages = await listPackages({ filter: tab.filter, q });
  const pending = tab.filter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Paquetes</h1>
        <Button asChild size="lg">
          <Link href="/admin/paquetes/nuevo">
            <PackagePlusIcon aria-hidden />
            Registrar
          </Link>
        </Button>
      </div>

      <nav
        aria-label="Filtros"
        className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={
              t.value === "todos"
                ? "/admin/paquetes"
                : `/admin/paquetes?filtro=${t.value}`
            }
            aria-current={t === tab ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-md text-center text-sm",
              t === tab && "bg-background font-semibold shadow-sm",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <form action="/admin/paquetes" className="flex gap-2">
        {tab.value !== "todos" ? (
          <input type="hidden" name="filtro" value={tab.value} />
        ) : null}
        <label htmlFor="packages-q" className="sr-only">
          Buscar
        </label>
        <input
          id="packages-q"
          name="q"
          defaultValue={q}
          placeholder="Clienta, código, bazar o nota"
          className="border-input h-11 w-full rounded-lg border bg-transparent px-3"
        />
        <Button type="submit" variant="outline" size="touch">
          Buscar
        </Button>
      </form>

      {pending ? (
        <PendingPackagesList key={`${tab.value}-${q}`} packages={packages} />
      ) : packages.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
          No hay paquetes registrados.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {packages.map((pkg) => (
            <li
              key={pkg.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div>
                <p className="font-medium">
                  {pkg.customer
                    ? `${pkg.customer.full_name} · ${pkg.customer.code}`
                    : "Sin identificar"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {pkg.bazaar_name ?? "Bazar desconocido"} ·{" "}
                  {formatDateTime(pkg.received_at)}
                </p>
              </div>
              {pkg.order ? (
                <Link
                  href={`/admin/pedidos/${pkg.order.folio}`}
                  className="flex min-h-11 items-center gap-2"
                >
                  <span className="underline-offset-4 hover:underline">
                    Pedido #{pkg.order.folio}
                  </span>
                  <OrderStatusBadge status={pkg.order.status} />
                </Link>
              ) : (
                <span className="text-sm">
                  {pkg.customer ? "Sin pedido" : "Sin identificar"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
