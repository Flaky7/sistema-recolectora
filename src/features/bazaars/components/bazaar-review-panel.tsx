import { PhoneIcon } from "lucide-react";

import { BazaarCard } from "@/components/bazaar-card";
import { formatDate, formatDateTime } from "@/lib/format";

import { DOCUMENT_TYPE_LABELS } from "../labels";
import type { BazaarForReview } from "../queries";
import { BazaarRegistrationButtons } from "./review-buttons";
import { ViewDocumentButton } from "./view-document-button";

/** A registration under review: proposed data and photos, documents, references (US5, s. 1). */
export function BazaarReviewPanel({ data }: { data: BazaarForReview }) {
  const { bazaar, proposal, proposalPhotos, documents, references } = data;
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Datos públicos propuestos</h2>
        {proposal ? (
          <BazaarCard
            name={proposal.name}
            brands={proposal.brands}
            linkUrl={proposal.link_url}
            photoUrls={proposalPhotos.map((p) => p.url)}
            className="max-w-sm"
          />
        ) : (
          <p className="text-muted-foreground">Sin datos públicos.</p>
        )}
      </section>
      <DocumentList bazaarId={bazaar.id} documents={documents} />
      <ReferenceList references={references} />
      {bazaar.status === "pending_review" ? (
        <section className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Enviado el{" "}
            {formatDateTime(bazaar.submitted_at ?? bazaar.created_at)}
          </p>
          <BazaarRegistrationButtons bazaarId={bazaar.id} />
        </section>
      ) : null}
    </div>
  );
}

export function DocumentList({
  bazaarId,
  documents,
}: {
  bazaarId: string;
  documents: BazaarForReview["documents"];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Documentos</h2>
      <ul className="divide-y rounded-xl border">
        {documents.map((slot) => {
          const id =
            slot.latest?.status === "pending"
              ? slot.latest.id
              : slot.current?.id;
          return (
            <li
              key={slot.type}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div>
                <p className="font-medium">{DOCUMENT_TYPE_LABELS[slot.type]}</p>
                <p className="text-muted-foreground text-sm">
                  {slot.latest?.status === "pending"
                    ? `En revisión desde ${formatDate(slot.latest.at)}`
                    : slot.current
                      ? `Vigente desde ${formatDate(slot.current.since)}`
                      : "Falta"}
                </p>
              </div>
              {id ? (
                <ViewDocumentButton bazaarId={bazaarId} documentId={id} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ReferenceList({
  references,
}: {
  references: BazaarForReview["references"];
}) {
  const lastUpdate = references
    .map((r) => r.updated_at)
    .sort()
    .at(-1);
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Referencias</h2>
      {references.length === 0 ? (
        <p className="text-muted-foreground">Sin referencias.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {references.map((ref) => (
            <li
              key={ref.position}
              className="flex items-center justify-between gap-2 p-3"
            >
              <span>{ref.full_name}</span>
              <a
                href={`tel:${ref.phone}`}
                className="text-primary flex min-h-11 items-center gap-1 underline-offset-4 hover:underline"
              >
                <PhoneIcon className="size-4" aria-hidden />
                {ref.phone}
              </a>
            </li>
          ))}
        </ul>
      )}
      {lastUpdate ? (
        <p className="text-muted-foreground text-sm">
          Actualizadas el {formatDateTime(lastUpdate)}
        </p>
      ) : null}
    </section>
  );
}
