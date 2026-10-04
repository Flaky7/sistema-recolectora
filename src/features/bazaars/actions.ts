"use server";

import { revalidatePath } from "next/cache";

import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth/session";
import { siteUrl } from "@/lib/notifications";
import type { ServerClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/uploads/paths";
import { uuid } from "@/lib/validation/messages";

import type { BazaarDocumentType, DocumentStatus } from "./labels";
import { photoUrls } from "./photos";
import {
  bazaarDocumentSchema,
  bazaarProposalSchema,
  bazaarReferencesSchema,
  reviewBazaarSchema,
  reviewItemSchema,
  signUpBazaarSchema,
  type BazaarDocumentInput,
  type BazaarProposalInput,
  type BazaarReferencesInput,
  type ReviewBazaarInput,
  type ReviewItemInput,
  type SignUpBazaarInput,
} from "./schemas";
import {
  emptyStorageTrash,
  reviewBazaarDocumentWith,
  reviewBazaarProposalWith,
  reviewBazaarWith,
  saveBazaarProposalWith,
  saveBazaarReferencesWith,
  setBazaarDocumentWith,
  submitBazaarForReviewWith,
  submitBazaarProposalWith,
} from "./service";

/** Private documents: 10-minute links (research R7). */
const DOCUMENT_URL_SECONDS = 10 * 60;

function revalidateBazaar(bazaarId?: string) {
  revalidatePath("/bazar");
  revalidatePath("/admin/bazares");
  revalidatePath("/admin");
  revalidatePath("/");
  if (bazaarId) revalidatePath(`/admin/bazares/${bazaarId}`);
}

async function ownBazaarId(supabase: ServerClient, profileId: string) {
  const { data } = await supabase
    .from("bazaars")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Runs `fn` with the signed-in bazaar's client and id. */
async function asBazaar<T>(
  fn: (supabase: ServerClient, bazaarId: string) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const auth = await authorize("bazaar");
  if (!auth.ok) return auth.result;
  const bazaarId = await ownBazaarId(auth.supabase, auth.profile.id);
  if (!bazaarId) return fail("No encontramos tu bazar.", { code: "NOT_FOUND" });
  const result = await fn(auth.supabase, bazaarId);
  if (result.ok) revalidateBazaar(bazaarId);
  return result;
}

// ---------------------------------------------------------------------------------------------
// Bazaar
// ---------------------------------------------------------------------------------------------

/** Step 1 of the registration: the account (research R3). The profile comes after signing in. */
export async function signUpBazaar(
  input: SignUpBazaarInput,
): Promise<ActionResult<{ needsEmailConfirmation: true }>> {
  const parsed = signUpBazaarSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: siteUrl("/auth/callback"),
      data: { role: "bazaar", privacy_accepted: parsed.data.acceptPrivacy },
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return fail("Elige una contraseña más segura.", {
        fieldErrors: { password: ["Elige una contraseña más segura."] },
      });
    }
    return fail(
      "No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo.",
    );
  }
  return ok({ needsEmailConfirmation: true });
}

export async function saveBazaarProposal(input: BazaarProposalInput) {
  const parsed = bazaarProposalSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return asBazaar((supabase, bazaarId) =>
    saveBazaarProposalWith(supabase, bazaarId, parsed.data),
  );
}

export async function setBazaarDocument(input: BazaarDocumentInput) {
  const parsed = bazaarDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return asBazaar((supabase, bazaarId) =>
    setBazaarDocumentWith(supabase, bazaarId, parsed.data),
  );
}

export async function saveBazaarReferences(input: BazaarReferencesInput) {
  const parsed = bazaarReferencesSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return asBazaar((supabase, bazaarId) =>
    saveBazaarReferencesWith(supabase, bazaarId, parsed.data.references),
  );
}

export async function submitBazaarForReview() {
  return asBazaar((supabase, bazaarId) =>
    submitBazaarForReviewWith(supabase, bazaarId),
  );
}

export async function submitBazaarProposal() {
  return asBazaar((supabase, bazaarId) =>
    submitBazaarProposalWith(supabase, bazaarId),
  );
}

/**
 * Links to see a proposal's photos: private ones signed for 60 minutes (owner bazaar or
 * collector, Storage RLS), already-published ones by their public URL.
 */
export async function getProposalPhotoUrls(
  proposalId: string,
): Promise<ActionResult<{ path: string; url: string }[]>> {
  const auth = await authorize("bazaar", "collector");
  if (!auth.ok) return auth.result;
  if (!uuid.safeParse(proposalId).success) return fail("Propuesta no válida.");
  const { supabase } = auth;

  const { data: proposal } = await supabase
    .from("bazaar_profile_proposals")
    .select("bazaar_id, photo_paths")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal)
    return fail("No encontramos la propuesta.", { code: "NOT_FOUND" });
  return ok(
    await photoUrls(supabase, proposal.bazaar_id, proposal.photo_paths),
  );
}

// ---------------------------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------------------------

export async function reviewBazaar(input: ReviewBazaarInput) {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = reviewBazaarSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const result = await reviewBazaarWith(
    auth.supabase,
    parsed.data.bazaarId,
    parsed.data.decision,
    parsed.data.reason,
  );
  if (result.ok) revalidateBazaar(parsed.data.bazaarId);
  return result;
}

export async function reviewBazaarProposal(input: ReviewItemInput) {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = reviewItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const result = await reviewBazaarProposalWith(
    auth.supabase,
    parsed.data.id,
    parsed.data.decision,
    parsed.data.reason,
  );
  if (result.ok) revalidateBazaar(result.data.bazaar_id);
  return result;
}

export async function reviewBazaarDocument(input: ReviewItemInput) {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  const parsed = reviewItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const result = await reviewBazaarDocumentWith(
    auth.supabase,
    parsed.data.id,
    parsed.data.decision,
    parsed.data.reason,
  );
  if (result.ok) revalidateBazaar(result.data.bazaar_id);
  return result;
}

export type DocumentUrl = {
  documentId: string;
  type: BazaarDocumentType;
  status: DocumentStatus;
  signedUrl: string;
  expiresAt: string;
};

/** 10-minute links to the current and under-review version of each document (FR-026). */
export async function getBazaarDocumentUrls(
  bazaarId: string,
): Promise<ActionResult<DocumentUrl[]>> {
  const auth = await authorize("collector");
  if (!auth.ok) return auth.result;
  if (!uuid.safeParse(bazaarId).success) return fail("Bazar no válido.");
  const { supabase } = auth;
  await emptyStorageTrash(supabase, bazaarId);

  const { data: docs } = await supabase
    .from("bazaar_documents")
    .select("id, type, status, storage_path")
    .eq("bazaar_id", bazaarId)
    .in("status", ["current", "pending"]);
  const withFiles = (docs ?? []).filter((d) => d.storage_path);
  if (withFiles.length === 0) return ok([]);

  const { data: signed, error } = await supabase.storage
    .from(BUCKETS.bazaarDocuments)
    .createSignedUrls(
      withFiles.map((d) => d.storage_path!),
      DOCUMENT_URL_SECONDS,
    );
  if (error) return fail("No tienes permiso para ver estos archivos.");
  const expiresAt = new Date(
    Date.now() + DOCUMENT_URL_SECONDS * 1000,
  ).toISOString();

  return ok(
    withFiles.map((doc) => ({
      documentId: doc.id,
      type: doc.type,
      status: doc.status,
      signedUrl:
        signed?.find((s) => s.path === doc.storage_path)?.signedUrl ?? "",
      expiresAt,
    })),
  );
}
