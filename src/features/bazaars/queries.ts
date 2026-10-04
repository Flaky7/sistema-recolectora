import "server-only";

import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import type { BazaarDocumentType, BazaarStatus, DocumentStatus } from "./labels";
import { photoUrls, publicPhotoUrl } from "./photos";
import { BAZAAR_DOCUMENT_TYPES } from "./schemas";

export type DocumentSlot = {
  type: BazaarDocumentType;
  /** The approved version: only its date, never the file (FR-034). */
  current: { id: string; since: string } | null;
  /** The newest upload: under review, or rejected with its reason. */
  latest:
    | { id: string; status: Extract<DocumentStatus, "pending" | "rejected">; at: string; reason: string | null }
    | null;
};

type DocumentRow = {
  id: string;
  type: BazaarDocumentType;
  status: DocumentStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function documentSlots(rows: DocumentRow[]): DocumentSlot[] {
  return BAZAAR_DOCUMENT_TYPES.map((type) => {
    const ofType = rows.filter((r) => r.type === type);
    const current = ofType.find((r) => r.status === "current");
    const pending = ofType.find((r) => r.status === "pending");
    const rejected = ofType.find((r) => r.status === "rejected");
    const latest = pending
      ? { id: pending.id, status: "pending" as const, at: pending.created_at, reason: null }
      : rejected && (!current || rejected.reviewed_at! > (current.reviewed_at ?? ""))
        ? {
            id: rejected.id,
            status: "rejected" as const,
            at: rejected.reviewed_at ?? rejected.created_at,
            reason: rejected.rejection_reason,
          }
        : null;
    return {
      type,
      current: current ? { id: current.id, since: current.reviewed_at ?? current.created_at } : null,
      latest,
    };
  });
}

/**
 * Everything /bazar shows: published version, open proposal (or last rejected one with its
 * reason), documents by type without files, and references (US4).
 */
export async function getMyBazaar() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data: bazaar } = await supabase
    .from("bazaars")
    .select()
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!bazaar) return null;

  const [photos, proposals, documents, references] = await Promise.all([
    supabase.from("bazaar_photos").select("storage_path").eq("bazaar_id", bazaar.id).order("position"),
    supabase
      .from("bazaar_profile_proposals")
      .select()
      .eq("bazaar_id", bazaar.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bazaar_documents")
      .select("id, type, status, rejection_reason, created_at, reviewed_at")
      .eq("bazaar_id", bazaar.id),
    supabase
      .from("bazaar_references")
      .select("position, full_name, phone, updated_at")
      .eq("bazaar_id", bazaar.id)
      .order("position"),
  ]);

  const publishedPaths = (photos.data ?? []).map((p) => p.storage_path);
  const allProposals = proposals.data ?? [];
  const openProposal = allProposals.find((p) => p.status === "draft" || p.status === "pending") ?? null;
  const lastRejected =
    !openProposal || openProposal.status === "draft"
      ? (allProposals.find((p) => p.status === "rejected") ?? null)
      : null;
  // A rejection only matters if nothing newer was approved since.
  const lastApproved = allProposals.find((p) => p.status === "approved");
  const showRejected =
    lastRejected && (!lastApproved || lastRejected.created_at > lastApproved.created_at)
      ? lastRejected
      : null;

  return {
    bazaar,
    published:
      bazaar.name && bazaar.brands && bazaar.link_url
        ? {
            name: bazaar.name,
            brands: bazaar.brands,
            linkUrl: bazaar.link_url,
            photoUrls: publishedPaths.map((p) => publicPhotoUrl(supabase, p)),
            photoPaths: publishedPaths,
          }
        : null,
    openProposal,
    openProposalPhotos: openProposal
      ? await photoUrls(supabase, bazaar.id, openProposal.photo_paths)
      : [],
    rejectedProposal: showRejected,
    documents: documentSlots(documents.data ?? []),
    references: references.data ?? [],
  };
}

export type MyBazaar = NonNullable<Awaited<ReturnType<typeof getMyBazaar>>>;

/** What is missing to submit the registration; photos are optional (US4, scenario 2). */
export function getBazaarCompleteness(data: MyBazaar) {
  const hasProfile = Boolean(data.openProposal);
  const documentsReady = data.documents.filter(
    (d) => d.current || d.latest?.status === "pending",
  ).length;
  const referencesReady = data.references.length;
  const missing: string[] = [];
  if (!hasProfile) missing.push("Datos públicos (nombre, marcas y link)");
  if (documentsReady < 4) missing.push(`Documentos (${documentsReady} de 4)`);
  if (referencesReady < 3) missing.push(`Referencias (${referencesReady} de 3)`);
  return { hasProfile, documentsReady, referencesReady, missing, complete: missing.length === 0 };
}

// ---------------------------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------------------------

/** Bazaars by status; search by published or proposed name, or brand (US5, US7). */
export async function listBazaars({ status, q }: { status?: BazaarStatus; q?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("bazaars")
    .select("id, name, brands, status, status_reason, submitted_at, reviewed_at, created_at, proposals:bazaar_profile_proposals(name, status)")
    .neq("status", "deleted")
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (status) query = query.eq("status", status);

  const { data } = await query;
  const rows = (data ?? []).map((b) => {
    const open = b.proposals.find((p) => p.status === "draft" || p.status === "pending");
    return { ...b, displayName: b.name ?? open?.name ?? "(sin nombre)", proposedName: open?.name ?? null };
  });

  const term = q?.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (!term) return rows;
  const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return rows.filter((b) =>
    [b.name, b.proposedName, ...(b.brands ?? [])].some((text) => text && normalize(text).includes(term)),
  );
}

/** Profile changes waiting for authorization, only from approved bazaars (FR-029). */
export async function listPendingProposals() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bazaar_profile_proposals")
    .select("id, name, submitted_at, bazaar:bazaars!inner(id, name, status)")
    .eq("status", "pending")
    .eq("bazaar.status", "approved")
    .order("submitted_at");
  return data ?? [];
}

/** New documents waiting for authorization from approved or suspended bazaars (FR-032). */
export async function listPendingDocuments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bazaar_documents")
    .select("id, type, created_at, bazaar:bazaars!inner(id, name, status)")
    .eq("status", "pending")
    .in("bazaar.status", ["approved", "suspended"])
    .order("created_at");
  return data ?? [];
}

/** Published version, open proposal, documents and references for the review page (US5). */
export async function getBazaarForReview(id: string) {
  const supabase = await createClient();
  const { data: bazaar } = await supabase
    .from("bazaars")
    .select("*, profile:profiles(email)")
    .eq("id", id)
    .maybeSingle();
  if (!bazaar) return null;

  const [photos, proposal, documents, references] = await Promise.all([
    supabase.from("bazaar_photos").select("storage_path").eq("bazaar_id", id).order("position"),
    supabase
      .from("bazaar_profile_proposals")
      .select()
      .eq("bazaar_id", id)
      .in("status", ["draft", "pending"])
      .maybeSingle(),
    supabase
      .from("bazaar_documents")
      .select("id, type, status, rejection_reason, created_at, reviewed_at")
      .eq("bazaar_id", id),
    supabase
      .from("bazaar_references")
      .select("position, full_name, phone, updated_at")
      .eq("bazaar_id", id)
      .order("position"),
  ]);

  const publishedPaths = (photos.data ?? []).map((p) => p.storage_path);
  const open = proposal.data;
  return {
    bazaar,
    published:
      bazaar.name && bazaar.brands && bazaar.link_url
        ? {
            name: bazaar.name,
            brands: bazaar.brands,
            linkUrl: bazaar.link_url,
            photoUrls: publishedPaths.map((p) => publicPhotoUrl(supabase, p)),
          }
        : null,
    proposal: open,
    proposalPhotos: open ? await photoUrls(supabase, id, open.photo_paths) : [],
    documents: documentSlots(documents.data ?? []),
    references: references.data ?? [],
  };
}

export type BazaarForReview = NonNullable<Awaited<ReturnType<typeof getBazaarForReview>>>;
