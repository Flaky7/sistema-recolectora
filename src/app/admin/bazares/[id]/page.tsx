import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BazaarCard } from "@/components/bazaar-card";
import { DeleteAccountDialog } from "@/features/account-deletion/components/delete-account-dialog";
import { Badge } from "@/components/ui/badge";
import {
  BazaarReviewPanel,
  DocumentList,
  ReferenceList,
} from "@/features/bazaars/components/bazaar-review-panel";
import { DocumentComparison } from "@/features/bazaars/components/document-comparison";
import { ProposalComparison } from "@/features/bazaars/components/proposal-comparison";
import { SuspendButtons } from "@/features/bazaars/components/review-buttons";
import { BAZAAR_STATUS_LABELS } from "@/features/bazaars/labels";
import { getBazaarForReview } from "@/features/bazaars/queries";
import { uuid } from "@/lib/validation/messages";

export const metadata: Metadata = { title: "Bazar" };

export default async function AdminBazaarPage({ params }: PageProps<"/admin/bazares/[id]">) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const data = await getBazaarForReview(id);
  if (!data) notFound();
  const { bazaar, published } = data;
  const reviewing = bazaar.status === "pending_review";
  const live = bazaar.status === "approved" || bazaar.status === "suspended";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/bazares" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Bazares
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {published?.name ?? data.proposal?.name ?? "Bazar sin nombre"}
          </h1>
          <Badge variant="secondary">{BAZAAR_STATUS_LABELS[bazaar.status]}</Badge>
        </div>
        {bazaar.profile?.email ? (
          <p className="text-muted-foreground text-sm">Cuenta: {bazaar.profile.email}</p>
        ) : null}
        {bazaar.status_reason ? <p>Motivo: {bazaar.status_reason}</p> : null}
      </header>

      {reviewing || bazaar.status === "draft" || bazaar.status === "rejected" ? (
        <BazaarReviewPanel data={data} />
      ) : null}

      {live ? (
        <>
          {published ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">En el directorio</h2>
              <BazaarCard
                name={published.name}
                brands={published.brands}
                linkUrl={published.linkUrl}
                photoUrls={published.photoUrls}
                className="max-w-sm"
              />
            </section>
          ) : null}
          <ProposalComparison data={data} />
          <DocumentComparison data={data} />
          <DocumentList bazaarId={bazaar.id} documents={data.documents} />
          <ReferenceList references={data.references} />
          <SuspendButtons bazaarId={bazaar.id} status={bazaar.status as "approved" | "suspended"} />
        </>
      ) : null}

      {bazaar.status !== "deleted" ? (
        <section className="space-y-2 border-t pt-6">
          <DeleteAccountDialog
            target={{ kind: "bazaar", bazaarId: bazaar.id, redirectTo: "/admin/bazares" }}
            triggerLabel="Eliminar datos personales"
            title="¿Eliminar los datos de este bazar?"
            deleted={<p>Cuenta de acceso, marcas, link, fotos, propuestas, documentos y referencias. Sale del directorio.</p>}
            kept={<p>El nombre del bazar en el historial de pedidos.</p>}
          />
        </section>
      ) : null}
    </div>
  );
}
