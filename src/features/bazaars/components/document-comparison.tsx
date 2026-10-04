import { formatDate } from "@/lib/format";

import { DOCUMENT_TYPE_LABELS } from "../labels";
import type { BazaarForReview } from "../queries";
import { DocumentButtons } from "./review-buttons";
import { ViewDocumentButton } from "./view-document-button";

/** New documents of an approved bazaar next to the current ones (US5, scenario 7). */
export function DocumentComparison({ data }: { data: BazaarForReview }) {
  const pending = data.documents.filter((slot) => slot.latest?.status === "pending");
  if (pending.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="documents-review-title">
      <h2 id="documents-review-title" className="text-lg font-semibold">
        Documentos por autorizar
      </h2>
      <ul className="space-y-3">
        {pending.map((slot) => (
          <li key={slot.type} className="space-y-3 rounded-xl border border-amber-300 p-4">
            <p className="font-medium">{DOCUMENT_TYPE_LABELS[slot.type]}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  {slot.current ? `Vigente desde ${formatDate(slot.current.since)}` : "Sin vigente"}
                </p>
                {slot.current ? (
                  <ViewDocumentButton bazaarId={data.bazaar.id} documentId={slot.current.id} label="Ver vigente" />
                ) : null}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Nuevo, enviado el {formatDate(slot.latest!.at)}</p>
                <ViewDocumentButton bazaarId={data.bazaar.id} documentId={slot.latest!.id} label="Ver nuevo" />
              </div>
            </div>
            <DocumentButtons documentId={slot.latest!.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
