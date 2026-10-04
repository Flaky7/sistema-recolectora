import { BazaarCard } from "@/components/bazaar-card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

import type { BazaarForReview } from "../queries";
import { ProposalButtons } from "./review-buttons";

/**
 * Published version and proposal side by side on desktop, stacked on phones, with the fields
 * that change marked (US5, scenario 5).
 */
export function ProposalComparison({ data }: { data: BazaarForReview }) {
  const { published, proposal, proposalPhotos } = data;
  if (!proposal || proposal.status !== "pending" || !published) return null;

  const changed = {
    name: proposal.name !== published.name,
    brands: proposal.brands.join("|") !== published.brands.join("|"),
    link: proposal.link_url !== published.linkUrl,
    photos:
      proposalPhotos.map((p) => p.url).join("|") !==
      published.photoUrls.join("|"),
  };
  const labels = [
    changed.name && "Nombre",
    changed.brands && "Marcas",
    changed.link && "Link",
    changed.photos && "Fotos",
  ].filter(Boolean) as string[];

  return (
    <section
      className="space-y-3 rounded-xl border border-amber-300 p-4"
      aria-labelledby="proposal-title"
    >
      <h2 id="proposal-title" className="text-lg font-semibold">
        Cambio por autorizar
      </h2>
      <p className="text-muted-foreground text-sm">
        Enviado el{" "}
        {formatDateTime(proposal.submitted_at ?? proposal.created_at)}
      </p>
      <p className="flex flex-wrap gap-2">
        <span>Cambia:</span>
        {labels.length === 0 ? <span>nada visible</span> : null}
        {labels.map((label) => (
          <Badge key={label} className="bg-amber-200 text-amber-950">
            {label}
          </Badge>
        ))}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-medium">Publicado</h3>
          <BazaarCard
            name={published.name}
            brands={published.brands}
            linkUrl={published.linkUrl}
            photoUrls={published.photoUrls}
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">Propuesta</h3>
          <BazaarCard
            name={proposal.name}
            brands={proposal.brands}
            linkUrl={proposal.link_url}
            photoUrls={proposalPhotos.map((p) => p.url)}
            className="ring-2 ring-amber-300"
          />
        </div>
      </div>
      <ProposalButtons proposalId={proposal.id} />
    </section>
  );
}
