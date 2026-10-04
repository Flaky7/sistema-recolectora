import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BAZAAR_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  type BazaarStatus,
} from "@/features/bazaars/labels";
import {
  listBazaars,
  listPendingDocuments,
  listPendingProposals,
} from "@/features/bazaars/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Bazares" };

const TABS: { value: string; label: string; status?: BazaarStatus }[] = [
  { value: "pending_review", label: "Por revisar", status: "pending_review" },
  { value: "cambios", label: "Cambios por autorizar" },
  { value: "approved", label: "Aprobados", status: "approved" },
  { value: "rejected", label: "Rechazados", status: "rejected" },
  { value: "suspended", label: "Suspendidos", status: "suspended" },
  { value: "draft", label: "Incompletos", status: "draft" },
  { value: "todos", label: "Todos" },
];

export default async function BazaarsPage({ searchParams }: PageProps<"/admin/bazares">) {
  const params = await searchParams;
  const tab = TABS.find((t) => t.value === params.estado) ?? TABS[0]!;
  const q = typeof params.q === "string" ? params.q : "";
  const showChanges = tab.value === "cambios";

  const [bazaars, proposals, documents] = await Promise.all([
    showChanges ? Promise.resolve([]) : listBazaars({ status: tab.status, q }),
    showChanges ? listPendingProposals() : Promise.resolve([]),
    showChanges ? listPendingDocuments() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bazares</h1>

      <nav aria-label="Estados" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {TABS.map((t) => (
            <li key={t.value}>
              <Link
                href={`/admin/bazares?estado=${t.value}`}
                aria-current={t === tab ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap",
                  t === tab && "bg-primary text-primary-foreground border-primary",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {showChanges ? (
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="font-semibold">Fichas ({proposals.length})</h2>
            {proposals.length === 0 ? (
              <p className="text-muted-foreground">No hay cambios de ficha por autorizar.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {proposals.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/bazares/${p.bazaar.id}`} className="hover:bg-muted/50 flex min-h-14 items-center justify-between gap-2 p-3">
                      <span>
                        <span className="block font-medium">{p.bazaar.name}</span>
                        <span className="text-muted-foreground text-sm">Propone: {p.name}</span>
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {p.submitted_at ? formatDate(p.submitted_at) : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold">Documentos ({documents.length})</h2>
            {documents.length === 0 ? (
              <p className="text-muted-foreground">No hay documentos por autorizar.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {documents.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/bazares/${d.bazaar.id}`} className="hover:bg-muted/50 flex min-h-14 items-center justify-between gap-2 p-3">
                      <span>
                        <span className="block font-medium">{d.bazaar.name}</span>
                        <span className="text-muted-foreground text-sm">{DOCUMENT_TYPE_LABELS[d.type]}</span>
                      </span>
                      <span className="text-muted-foreground text-sm">{formatDate(d.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <>
          <form action="/admin/bazares" className="flex gap-2">
            <input type="hidden" name="estado" value={tab.value} />
            <label htmlFor="bazaars-q" className="sr-only">
              Buscar
            </label>
            <input
              id="bazaars-q"
              name="q"
              defaultValue={q}
              placeholder="Nombre o marca"
              className="border-input h-11 w-full rounded-lg border bg-transparent px-3"
            />
            <Button type="submit" variant="outline" size="touch">
              Buscar
            </Button>
          </form>
          {bazaars.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
              No hay bazares en esta lista.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {bazaars.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bazares/${b.id}`} className="hover:bg-muted/50 flex min-h-14 flex-wrap items-center justify-between gap-2 p-3">
                    <span>
                      <span className="block font-medium">{b.displayName}</span>
                      <span className="text-muted-foreground text-sm">
                        {(b.brands ?? []).join(", ")}
                      </span>
                    </span>
                    <Badge variant="secondary">{BAZAAR_STATUS_LABELS[b.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
