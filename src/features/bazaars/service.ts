import "server-only";

import * as Sentry from "@sentry/nextjs";

import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import type { Database } from "@/lib/supabase/database.types";
import type { ServerClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/uploads/paths";

import type { BazaarDocumentType } from "./labels";
import { photosBelongTo } from "./schemas";

/**
 * Bazaar rules shared by the Server Actions and the integration tests. Every function gets the
 * caller's client: RLS, triggers and Storage policies decide what each role may do.
 */

type Proposal = Database["public"]["Tables"]["bazaar_profile_proposals"]["Row"];
type BazaarDocument = Database["public"]["Tables"]["bazaar_documents"]["Row"];
type Bazaar = Database["public"]["Tables"]["bazaars"]["Row"];

const STORAGE_DELETE_FAILED = "storage cleanup failed";

/** Deleting files never undoes a saved change; failures are reported and left for cleanup. */
async function removeFiles(
  supabase: ServerClient,
  bucket: string,
  paths: (string | null)[],
) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(list);
  if (error)
    Sentry.captureMessage(`${STORAGE_DELETE_FAILED}: ${bucket}`, "warning");
}

async function bazaarOf(supabase: ServerClient, bazaarId: string) {
  const { data } = await supabase
    .from("bazaars")
    .select()
    .eq("id", bazaarId)
    .maybeSingle();
  return data;
}

async function publishedPaths(supabase: ServerClient, bazaarId: string) {
  const { data } = await supabase
    .from("bazaar_photos")
    .select("storage_path")
    .eq("bazaar_id", bazaarId)
    .order("position");
  return (data ?? []).map((p) => p.storage_path);
}

// ---------------------------------------------------------------------------------------------
// Bazaar (owner)
// ---------------------------------------------------------------------------------------------

export type ProposalValues = {
  name: string;
  brands: string[];
  linkUrl: string;
  photoPaths: string[];
};

/**
 * Saves the bazaar's draft (FR-029). Creates it if there is none; if a change was already under
 * review it is discarded and replaced by the new draft. Photos that were removed and are not
 * published are deleted from the private bucket.
 */
export async function saveBazaarProposalWith(
  supabase: ServerClient,
  bazaarId: string,
  values: ProposalValues,
): Promise<ActionResult<Proposal>> {
  if (!photosBelongTo(values.photoPaths, bazaarId)) {
    return fail("Alguna foto no es válida. Vuelve a subirla.");
  }
  const bazaar = await bazaarOf(supabase, bazaarId);
  if (!bazaar) return fail("No encontramos tu bazar.", { code: "NOT_FOUND" });
  if (bazaar.status === "suspended" || bazaar.status === "deleted") {
    return fail("Tu bazar está dado de baja; no puedes cambiar tu ficha.");
  }
  if (bazaar.status === "pending_review") {
    return fail(
      "Tu registro está en revisión; espera la respuesta de la recolectora.",
    );
  }

  const { data: open } = await supabase
    .from("bazaar_profile_proposals")
    .select()
    .eq("bazaar_id", bazaarId)
    .in("status", ["draft", "pending"])
    .maybeSingle();

  const row = {
    name: values.name,
    brands: values.brands,
    link_url: values.linkUrl,
    photo_paths: values.photoPaths,
  };

  let saved: Proposal;
  if (open?.status === "draft") {
    const { data, error } = await supabase
      .from("bazaar_profile_proposals")
      .update(row)
      .eq("id", open.id)
      .select()
      .single();
    if (error) return fromDatabaseError(error);
    saved = data;
  } else {
    if (open?.status === "pending") {
      const { error } = await supabase
        .from("bazaar_profile_proposals")
        .update({ status: "discarded" })
        .eq("id", open.id);
      if (error) return fromDatabaseError(error);
    }
    const { data, error } = await supabase
      .from("bazaar_profile_proposals")
      .insert({ bazaar_id: bazaarId, ...row })
      .select()
      .single();
    if (error) return fromDatabaseError(error);
    saved = data;
  }

  if (open) {
    const published = await publishedPaths(supabase, bazaarId);
    const dropped = open.photo_paths.filter(
      (p) => !values.photoPaths.includes(p) && !published.includes(p),
    );
    await removeFiles(supabase, BUCKETS.bazaarPhotoSubmissions, dropped);
  }
  return ok(saved);
}

/**
 * FR-032, FR-034: a new version of a document stays under review. If one of the same type was
 * already under review, it is replaced (row and file).
 */
export async function setBazaarDocumentWith(
  supabase: ServerClient,
  bazaarId: string,
  input: { type: BazaarDocumentType; documentPath: string },
): Promise<
  ActionResult<{
    type: BazaarDocumentType;
    status: "pending";
    uploadedAt: string;
  }>
> {
  const pattern = new RegExp(
    `^${bazaarId}/${input.type}-[A-Za-z0-9_-]+\\.(jpg|png|webp|pdf)$`,
  );
  if (!pattern.test(input.documentPath)) {
    return fail("El archivo no es válido. Vuelve a subirlo.");
  }

  const { data: previous } = await supabase
    .from("bazaar_documents")
    .select("id, storage_path")
    .eq("bazaar_id", bazaarId)
    .eq("type", input.type)
    .eq("status", "pending")
    .maybeSingle();
  if (previous) {
    // A bazaar cannot delete its document files (that needs read access, FR-034); the replaced
    // file goes to the trash and the collector removes it when she reviews (research R23).
    if (previous.storage_path) {
      const { error: trashError } = await supabase
        .from("storage_trash")
        .insert({
          bazaar_id: bazaarId,
          bucket_id: BUCKETS.bazaarDocuments,
          path: previous.storage_path,
        });
      if (trashError && trashError.code !== "23505")
        return fromDatabaseError(trashError);
    }
    const { error } = await supabase
      .from("bazaar_documents")
      .delete()
      .eq("id", previous.id);
    if (error) return fromDatabaseError(error);
  }

  const { data, error } = await supabase
    .from("bazaar_documents")
    .insert({
      bazaar_id: bazaarId,
      type: input.type,
      storage_path: input.documentPath,
    })
    .select("created_at")
    .single();
  if (error) return fromDatabaseError(error);
  return ok({
    type: input.type,
    status: "pending",
    uploadedAt: data.created_at,
  });
}

/** FR-028: the 3 references, editable in any state except deleted (also while suspended). */
export async function saveBazaarReferencesWith(
  supabase: ServerClient,
  bazaarId: string,
  references: { fullName: string; phone: string }[],
) {
  const { data, error } = await supabase
    .from("bazaar_references")
    .upsert(
      references.map((r, index) => ({
        bazaar_id: bazaarId,
        position: index + 1,
        full_name: r.fullName,
        phone: r.phone,
      })),
      { onConflict: "bazaar_id,position" },
    )
    .select();
  if (error) return fromDatabaseError(error);
  return ok(data);
}

/** draft/rejected -> pending_review. The trigger lists what is missing (photos are optional). */
export async function submitBazaarForReviewWith(
  supabase: ServerClient,
  bazaarId: string,
): Promise<ActionResult<Bazaar>> {
  const { data, error } = await supabase
    .from("bazaars")
    .update({ status: "pending_review" })
    .eq("id", bazaarId)
    .select()
    .single();
  if (error) return fromDatabaseError(error);
  return ok(data);
}

/** Approved bazaar sends its draft change for review ("Cambio en revisión"). */
export async function submitBazaarProposalWith(
  supabase: ServerClient,
  bazaarId: string,
): Promise<ActionResult<Proposal>> {
  const { data, error } = await supabase
    .from("bazaar_profile_proposals")
    .update({ status: "pending" })
    .eq("bazaar_id", bazaarId)
    .eq("status", "draft")
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return fail("No tienes cambios por enviar.");
    return fromDatabaseError(error);
  }
  return ok(data);
}

// ---------------------------------------------------------------------------------------------
// Collector reviews
// ---------------------------------------------------------------------------------------------

/** Deletes the files a bazaar replaced (research R23). Runs with the collector's session. */
export async function emptyStorageTrash(
  supabase: ServerClient,
  bazaarId: string,
) {
  const { data } = await supabase
    .from("storage_trash")
    .select("id, path")
    .eq("bazaar_id", bazaarId);
  if (!data || data.length === 0) return;
  const { error } = await supabase.storage
    .from(BUCKETS.bazaarDocuments)
    .remove(data.map((item) => item.path));
  if (error) {
    Sentry.captureMessage(`${STORAGE_DELETE_FAILED}: storage_trash`, "warning");
    return;
  }
  await supabase
    .from("storage_trash")
    .delete()
    .in(
      "id",
      data.map((item) => item.id),
    );
}

/**
 * Publishes a pending proposal (research R17): (1) copies new photos from the private bucket to
 * the public one, (2) apply_bazaar_proposal updates the rows in one transaction, (3) deletes the
 * replaced public photos and the private copies already published. If (1) fails nothing changes.
 */
async function publishProposal(
  supabase: ServerClient,
  proposal: Proposal,
): Promise<ActionResult<Proposal>> {
  const published = await publishedPaths(supabase, proposal.bazaar_id);
  const toCopy = proposal.photo_paths.filter((p) => !published.includes(p));
  const copied: string[] = [];

  for (const path of toCopy) {
    const { error } = await supabase.storage
      .from(BUCKETS.bazaarPhotoSubmissions)
      .copy(path, path, { destinationBucket: BUCKETS.bazaarPhotos });
    if (error) {
      await removeFiles(supabase, BUCKETS.bazaarPhotos, copied);
      return fail("No se pudieron publicar las fotos. Intenta de nuevo.");
    }
    copied.push(path);
  }

  const { data: replaced, error } = await supabase.rpc(
    "apply_bazaar_proposal",
    {
      proposal_id: proposal.id,
      public_paths: proposal.photo_paths,
    },
  );
  if (error) {
    await removeFiles(supabase, BUCKETS.bazaarPhotos, copied);
    return fromDatabaseError(error);
  }

  await removeFiles(supabase, BUCKETS.bazaarPhotos, replaced ?? []);
  await removeFiles(supabase, BUCKETS.bazaarPhotoSubmissions, copied);

  const { data: updated } = await supabase
    .from("bazaar_profile_proposals")
    .select()
    .eq("id", proposal.id)
    .single();
  return ok(updated ?? proposal);
}

/** FR-029: authorize (publish) or reject, with a reason, a change proposed by an approved bazaar. */
export async function reviewBazaarProposalWith(
  supabase: ServerClient,
  proposalId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<ActionResult<Proposal>> {
  const { data: proposal } = await supabase
    .from("bazaar_profile_proposals")
    .select()
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal || proposal.status !== "pending") {
    return fail("Esta propuesta ya no está en revisión.");
  }

  if (decision === "approve") return publishProposal(supabase, proposal);

  if (!reason || reason.trim().length < 3)
    return fail("Escribe el motivo del rechazo.");
  const { data, error } = await supabase
    .from("bazaar_profile_proposals")
    .update({ status: "rejected", rejection_reason: reason.trim() })
    .eq("id", proposalId)
    .select()
    .single();
  if (error) return fromDatabaseError(error);
  return ok(data);
}

/**
 * FR-027: approve (publishes the pending proposal; documents become current), reject or suspend
 * with a reason, or reactivate.
 */
export async function reviewBazaarWith(
  supabase: ServerClient,
  bazaarId: string,
  decision: "approve" | "reject" | "suspend" | "reactivate",
  reason?: string,
): Promise<ActionResult<Bazaar>> {
  const bazaar = await bazaarOf(supabase, bazaarId);
  if (!bazaar) return fail("No encontramos ese bazar.", { code: "NOT_FOUND" });

  if (decision === "approve") {
    if (bazaar.status !== "pending_review")
      return fail("Este bazar no está pendiente de revisión.");
    const { data: proposal } = await supabase
      .from("bazaar_profile_proposals")
      .select()
      .eq("bazaar_id", bazaarId)
      .eq("status", "pending")
      .maybeSingle();
    if (!proposal)
      return fail("Este bazar no tiene datos públicos por revisar.");
    const published = await publishProposal(supabase, proposal);
    if (!published.ok) return published;
  }

  const status =
    decision === "approve" || decision === "reactivate"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : "suspended";
  const { data, error } = await supabase
    .from("bazaars")
    .update({ status, status_reason: reason?.trim() || null })
    .eq("id", bazaarId)
    .select()
    .single();
  if (error) return fromDatabaseError(error);
  await emptyStorageTrash(supabase, bazaarId);
  return ok(data);
}

/** FR-033: approve (old file deleted) or reject (rejected file deleted) a document under review. */
export async function reviewBazaarDocumentWith(
  supabase: ServerClient,
  documentId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<ActionResult<BazaarDocument>> {
  const { data: path, error } =
    decision === "approve"
      ? await supabase.rpc("approve_bazaar_document", {
          document_id: documentId,
        })
      : await supabase.rpc("reject_bazaar_document", {
          document_id: documentId,
          reason: reason ?? "",
        });
  if (error) return fromDatabaseError(error);
  await removeFiles(supabase, BUCKETS.bazaarDocuments, [path]);

  const { data } = await supabase
    .from("bazaar_documents")
    .select()
    .eq("id", documentId)
    .single();
  if (!data) return fail("No encontramos el documento.");
  await emptyStorageTrash(supabase, data.bazaar_id);
  return ok(data);
}
