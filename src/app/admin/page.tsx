import { PackagePlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getDashboardCounts } from "@/features/admin/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Panel" };

export default async function AdminHomePage() {
  const counts = await getDashboardCounts();

  const cards = [
    { label: "Pagos por confirmar", value: counts.paymentsToReview, href: "/admin/pagos" },
    {
      label: "Paquetes sin asignar",
      value: counts.unassignedPackages,
      href: "/admin/paquetes?filtro=sin-pedido",
    },
    {
      label: "Pedidos completos por enviar",
      value: counts.ordersToShip,
      href: "/admin/pedidos?estado=complete",
    },
    {
      label: "Bazares por revisar",
      value: counts.bazaarsToReview,
      href: "/admin/bazares?estado=pending_review",
    },
    {
      label: "Cambios de ficha por autorizar",
      value: counts.proposalsToReview,
      href: "/admin/bazares?estado=cambios",
    },
    {
      label: "Documentos por autorizar",
      value: counts.documentsToReview,
      href: "/admin/bazares?estado=cambios",
    },
  ];

  const sections = [
    { label: "Pedidos", href: "/admin/pedidos" },
    { label: "Clientas", href: "/admin/clientas" },
    { label: "Paquetes", href: "/admin/paquetes" },
    { label: "Bazares", href: "/admin/bazares" },
    { label: "Envíos", href: "/admin/envios" },
    { label: "Configuración", href: "/admin/configuracion" },
  ];

  return (
    <div className="space-y-6">
      <Button asChild size="touch" className="h-14 w-full text-lg">
        <Link href="/admin/paquetes/nuevo">
          <PackagePlusIcon aria-hidden />
          Registrar paquete
        </Link>
      </Button>

      <section aria-labelledby="pending-title" className="space-y-3">
        <h1 id="pending-title" className="text-xl font-semibold">
          Pendientes
        </h1>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {cards.map((card) => (
            <li key={card.label}>
              <Link
                href={card.href}
                className={cn(
                  "hover:bg-muted/50 flex h-full flex-col justify-between gap-2 rounded-xl border p-4",
                  card.value > 0 && "border-primary/40 bg-primary/5",
                )}
              >
                <span className="text-3xl font-semibold" data-testid={`count-${card.label}`}>
                  {card.value}
                </span>
                <span className="text-sm">{card.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sections-title" className="space-y-3">
        <h2 id="sections-title" className="text-xl font-semibold">
          Secciones
        </h2>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {sections.map((section) => (
            <li key={section.href}>
              <Button asChild variant="outline" size="touch" className="w-full">
                <Link href={section.href}>{section.label}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
