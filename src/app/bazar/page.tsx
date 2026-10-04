import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BazaarCard } from "@/components/bazaar-card";
import { DeleteAccountDialog } from "@/features/account-deletion/components/delete-account-dialog";
import { Badge } from "@/components/ui/badge";
import { BazaarDocumentsForm } from "@/features/bazaars/components/bazaar-documents-form";
import { BazaarProposalForm } from "@/features/bazaars/components/bazaar-proposal-form";
import { BazaarReferencesForm } from "@/features/bazaars/components/bazaar-references-form";
import { ProposeChangeSection } from "@/features/bazaars/components/propose-change-section";
import { SubmitForReviewButton } from "@/features/bazaars/components/submit-for-review-button";
import { BAZAAR_STATUS_HINTS, BAZAAR_STATUS_LABELS } from "@/features/bazaars/labels";
import { getBazaarCompleteness, getMyBazaar } from "@/features/bazaars/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Mi bazar" };

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2Icon className="size-5 text-emerald-600" aria-label="Listo" />
      ) : (
        <CircleIcon className="text-muted-foreground size-5" aria-label="Pendiente" />
      )}
      {label}
    </li>
  );
}

export default async function BazaarHomePage() {
  const data = await getMyBazaar();
  if (!data) notFound();
  const { bazaar, published, openProposal, openProposalPhotos, rejectedProposal } = data;
  const status = bazaar.status;
  const registering = status === "draft" || status === "rejected";
  const suspended = status === "suspended";
  const completeness = getBazaarCompleteness(data);

  const proposalDefaults = openProposal
    ? {
        name: openProposal.name,
        brands: openProposal.brands,
        linkUrl: openProposal.link_url,
        photos: openProposalPhotos,
      }
    : published
      ? {
          name: published.name,
          brands: published.brands,
          linkUrl: published.linkUrl,
          photos: published.photoPaths.map((path, i) => ({ path, url: published.photoUrls[i]! })),
        }
      : { name: "", brands: [], linkUrl: "", photos: [] };

  return (
    <div className="space-y-8">
      <section className="space-y-2" aria-labelledby="status-title">
        <div className="flex flex-wrap items-center gap-2">
          <h1 id="status-title" className="text-2xl font-semibold">
            {published?.name ?? openProposal?.name ?? "Mi bazar"}
          </h1>
          <Badge variant="secondary">{BAZAAR_STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-muted-foreground">{BAZAAR_STATUS_HINTS[status]}</p>
        {bazaar.status_reason && (status === "rejected" || suspended) ? (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg p-3">
            Motivo: {bazaar.status_reason}
          </p>
        ) : null}
      </section>

      {registering ? (
        <section className="space-y-3 rounded-xl border p-4" aria-labelledby="steps-title">
          <h2 id="steps-title" className="font-semibold">
            Tu registro
          </h2>
          <ol className="space-y-2">
            <Step done={completeness.hasProfile} label="Datos públicos (nombre, marcas y link)" />
            <Step done={completeness.documentsReady === 4} label={`Documentos (${completeness.documentsReady} de 4)`} />
            <Step done={completeness.referencesReady === 3} label={`Referencias (${completeness.referencesReady} de 3)`} />
            <li className="text-muted-foreground text-sm">Fotos: opcionales</li>
          </ol>
          <SubmitForReviewButton resubmit={status === "rejected"} />
        </section>
      ) : null}

      {status === "approved" || suspended ? (
        <section className="space-y-3" aria-labelledby="directory-title">
          <h2 id="directory-title" className="text-xl font-semibold">
            Así te ven en el directorio
          </h2>
          {published ? (
            <BazaarCard
              name={published.name}
              brands={published.brands}
              linkUrl={published.linkUrl}
              photoUrls={published.photoUrls}
              className="max-w-sm"
            />
          ) : null}

          {openProposal?.status === "pending" ? (
            <div className="space-y-2 rounded-xl border border-amber-300 p-4">
              <p className="font-semibold">Cambio en revisión</p>
              <p className="text-muted-foreground text-sm">
                Enviado el {formatDateTime(openProposal.submitted_at ?? openProposal.created_at)}. El
                directorio muestra tu versión anterior hasta que la recolectora lo autorice.
              </p>
              <BazaarCard
                name={openProposal.name}
                brands={openProposal.brands}
                linkUrl={openProposal.link_url}
                photoUrls={openProposalPhotos.map((p) => p.url)}
                className="max-w-sm"
              />
            </div>
          ) : null}

          {rejectedProposal ? (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg p-3">
              Tu último cambio no se autorizó. Motivo: {rejectedProposal.rejection_reason}
            </p>
          ) : null}

          {status === "approved" ? (
            <ProposeChangeSection
              bazaarId={bazaar.id}
              defaults={proposalDefaults}
              hasPendingChange={openProposal?.status === "pending"}
            />
          ) : null}
        </section>
      ) : null}

      {registering ? (
        <section className="space-y-3" aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-xl font-semibold">
            Datos públicos
          </h2>
          <BazaarProposalForm bazaarId={bazaar.id} defaults={proposalDefaults} mode="registration" />
        </section>
      ) : null}

      {status === "pending_review" && openProposal ? (
        <section className="space-y-3" aria-labelledby="preview-title">
          <h2 id="preview-title" className="text-xl font-semibold">
            Vista previa
          </h2>
          <BazaarCard
            name={openProposal.name}
            brands={openProposal.brands}
            linkUrl={openProposal.link_url}
            photoUrls={openProposalPhotos.map((p) => p.url)}
            className="max-w-sm"
          />
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="documents-title">
        <h2 id="documents-title" className="text-xl font-semibold">
          Documentos privados
        </h2>
        <p className="text-muted-foreground text-sm">
          Solo la recolectora puede verlos. Una vez enviados, ni tú puedes abrirlos.
        </p>
        <BazaarDocumentsForm bazaarId={bazaar.id} slots={data.documents} disabled={suspended} />
      </section>

      <section className="space-y-3" aria-labelledby="references-title">
        <h2 id="references-title" className="text-xl font-semibold">
          Referencias
        </h2>
        <BazaarReferencesForm
          defaults={data.references.map((r) => ({ fullName: r.full_name, phone: r.phone }))}
        />
      </section>

      <section aria-labelledby="delete-title" className="space-y-3 border-t pt-6">
        <h2 id="delete-title" className="text-xl font-semibold">
          Eliminar mi cuenta
        </h2>
        <DeleteAccountDialog
          target={{ kind: "self" }}
          triggerLabel="Eliminar mi cuenta"
          title="¿Eliminar la cuenta de tu bazar?"
          deleted={<p>Tu cuenta, marcas, link, fotos, propuestas, documentos y referencias. Dejas de aparecer en el directorio.</p>}
          kept={<p>El nombre del bazar en los pedidos anteriores de las clientas.</p>}
        />
      </section>
    </div>
  );
}
