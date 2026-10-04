import { UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListFilters } from "@/components/list-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  type CustomerStatus,
} from "@/features/customers/labels";
import { listCustomers } from "@/features/customers/queries";

export const metadata: Metadata = { title: "Clientas" };

const STATUSES: CustomerStatus[] = ["active", "deactivated", "deleted"];

export default async function CustomersPage({
  searchParams,
}: PageProps<"/admin/clientas">) {
  const params = await searchParams;
  const q =
    typeof params.q === "string" && params.q.trim()
      ? params.q.trim()
      : undefined;
  const status = STATUSES.find((s) => s === params.estado);
  const account =
    params.cuenta === "con" || params.cuenta === "sin"
      ? params.cuenta
      : undefined;
  const customers = await listCustomers({
    q,
    status,
    hasAccount:
      account === "con" ? true : account === "sin" ? false : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Clientas</h1>
        <Button asChild size="lg">
          <Link href="/admin/clientas/nueva">
            <UserPlusIcon aria-hidden />
            Nueva
          </Link>
        </Button>
      </div>

      <ListFilters
        action="/admin/clientas"
        texts={[{ name: "q", label: "Nombre, código o WhatsApp", value: q }]}
        selects={[
          {
            name: "cuenta",
            label: "Cuenta",
            value: account,
            allLabel: "Con y sin cuenta",
            options: [
              { value: "con", label: "Con cuenta" },
              { value: "sin", label: "Sin cuenta" },
            ],
          },
          {
            name: "estado",
            label: "Estado",
            value: status,
            allLabel: "Todos los estados",
            options: STATUSES.map((s) => ({
              value: s,
              label: CUSTOMER_STATUS_LABELS[s],
            })),
          },
        ]}
      />

      {customers.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
          No hay clientas con esos filtros.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border" aria-label="Clientas">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clientas/${c.code}`}
                className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <span>
                  <span className="block font-medium">{c.full_name}</span>
                  <span className="text-muted-foreground text-sm">
                    {CUSTOMER_TYPE_LABELS[c.type]}
                    {c.whatsapp ? ` · ${c.whatsapp}` : ""}
                    {c.profile_id ? "" : " · sin cuenta"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {c.status !== "active" ? (
                    <Badge variant="secondary">
                      {CUSTOMER_STATUS_LABELS[c.status]}
                    </Badge>
                  ) : null}
                  <span className="font-mono">{c.code}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
