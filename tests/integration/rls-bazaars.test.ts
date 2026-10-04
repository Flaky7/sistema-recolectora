import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  saveBazaarProposalWith,
  saveBazaarReferencesWith,
  setBazaarDocumentWith,
  submitBazaarForReviewWith,
} from "@/features/bazaars/service";

import { createBazaar, createCustomer } from "../helpers/fixtures";
import {
  adminClient,
  anonClient,
  createTestUser,
  must,
  resetTestData,
  type TestUser,
} from "../helpers/supabase";

type BazaarUser = TestUser & { bazaarId: string };

let bazaar: BazaarUser;
let other: BazaarUser;
let collector: TestUser;

const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

beforeAll(async () => {
  [bazaar, other, collector] = await Promise.all([
    createBazaar("draft"),
    createBazaar("approved"),
    createTestUser("collector"),
  ]);
});

afterAll(resetTestData);

async function uploadDocument(user: BazaarUser, type: string) {
  const path = `${user.bazaarId}/${type}-${crypto.randomUUID()}.jpg`;
  must(await user.client.storage.from("bazaar-documents").upload(path, jpeg()));
  return path;
}

const references = [1, 2, 3].map((i) => ({ fullName: `Referencia ${i}`, phone: `664000000${i}` }));
const proposal = {
  name: "Bazar Sin Fotos",
  brands: ["Shein"],
  linkUrl: "https://www.facebook.com/bazarsinfotos",
  photoPaths: [],
};

describe("bazaars RLS (FR-026, FR-030, US4)", () => {
  it("the bazaar reads only its own bazaar and cannot write published data", async () => {
    const rows = must(await bazaar.client.from("bazaars").select("id"));
    expect(rows.map((r) => r.id)).toEqual([bazaar.bazaarId]);

    const { error } = await bazaar.client
      .from("bazaars")
      .update({ name: "Me publico solo" })
      .eq("id", bazaar.bazaarId);
    expect(error).not.toBeNull();

    const status = await bazaar.client
      .from("bazaars")
      .update({ status: "approved" })
      .eq("id", bazaar.bazaarId);
    expect(status.error).not.toBeNull();
  });

  it("the bazaar cannot write bazaar_photos", async () => {
    const { error } = await bazaar.client.from("bazaar_photos").insert({
      bazaar_id: bazaar.bazaarId,
      position: 1,
      storage_path: `${bazaar.bazaarId}/x.jpg`,
    });
    expect(error).not.toBeNull();
  });

  it("photos: never into the public bucket; private submissions only for the owner and collector", async () => {
    const publicUpload = await bazaar.client.storage
      .from("bazaar-photos")
      .upload(`${bazaar.bazaarId}/${crypto.randomUUID()}.jpg`, jpeg());
    expect(publicUpload.error).not.toBeNull();

    const path = `${bazaar.bazaarId}/${crypto.randomUUID()}.jpg`;
    must(await bazaar.client.storage.from("bazaar-photo-submissions").upload(path, jpeg()));

    const own = await bazaar.client.storage.from("bazaar-photo-submissions").createSignedUrl(path, 60);
    expect(own.error).toBeNull();
    const byCollector = await collector.client.storage
      .from("bazaar-photo-submissions")
      .createSignedUrl(path, 60);
    expect(byCollector.error).toBeNull();

    const customer = await createCustomer();
    for (const client of [anonClient(), customer.client, other.client]) {
      const attempt = await client.storage.from("bazaar-photo-submissions").createSignedUrl(path, 60);
      expect(attempt.error).not.toBeNull();
    }
  });

  it("documents: the bazaar adds pending rows but never reads files or changes status", async () => {
    const path = await uploadDocument(bazaar, "id_card");
    const read = await bazaar.client.storage.from("bazaar-documents").createSignedUrl(path, 60);
    expect(read.error).not.toBeNull();

    const current = await bazaar.client
      .from("bazaar_documents")
      .insert({ bazaar_id: bazaar.bazaarId, type: "id_card", storage_path: path, status: "current" });
    expect(current.error).not.toBeNull();

    const doc = must(
      await bazaar.client
        .from("bazaar_documents")
        .insert({ bazaar_id: bazaar.bazaarId, type: "id_card", storage_path: path })
        .select()
        .single(),
    );
    expect(doc.status).toBe("pending");

    // RLS denies updates by filtering: nothing changes.
    await bazaar.client.from("bazaar_documents").update({ status: "current" }).eq("id", doc.id);
    const after = must(
      await adminClient().from("bazaar_documents").select("status").eq("id", doc.id).single(),
    );
    expect(after.status).toBe("pending");
  });

  it("the bazaar cannot delete a current document", async () => {
    const currentDoc = must(
      await adminClient()
        .from("bazaar_documents")
        .select("id")
        .eq("bazaar_id", other.bazaarId)
        .eq("status", "current")
        .limit(1)
        .single(),
    );
    await other.client.from("bazaar_documents").delete().eq("id", currentDoc.id);
    const still = must(
      await adminClient().from("bazaar_documents").select("id").eq("id", currentDoc.id),
    );
    expect(still).toHaveLength(1);
  });

  it("storage_trash: a bazaar only adds its own files and cannot read the list", async () => {
    const own = await bazaar.client.from("storage_trash").insert({
      bazaar_id: bazaar.bazaarId,
      bucket_id: "bazaar-documents",
      path: `${bazaar.bazaarId}/selfie-${crypto.randomUUID()}.jpg`,
    });
    expect(own.error).toBeNull();
    const foreign = await bazaar.client.from("storage_trash").insert({
      bazaar_id: other.bazaarId,
      bucket_id: "bazaar-documents",
      path: `${other.bazaarId}/selfie-${crypto.randomUUID()}.jpg`,
    });
    expect(foreign.error).not.toBeNull();
    expect(must(await bazaar.client.from("storage_trash").select("id"))).toEqual([]);
  });

  it("only edits its own proposal while it is a draft", async () => {
    const saved = await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, proposal);
    expect(saved.ok).toBe(true);

    const pendingProposal = must(
      await adminClient()
        .from("bazaar_profile_proposals")
        .insert({
          bazaar_id: other.bazaarId,
          name: "Otro",
          brands: ["X"],
          link_url: "https://x.mx",
          status: "pending",
        })
        .select()
        .single(),
    );
    const { error } = await other.client
      .from("bazaar_profile_proposals")
      .update({ name: "Edito en revisión" })
      .eq("id", pendingProposal.id);
    expect(error).not.toBeNull();
    must(
      await adminClient()
        .from("bazaar_profile_proposals")
        .update({ status: "discarded" })
        .eq("id", pendingProposal.id),
    );
  });

  it("submitting fails listing what is missing, and works with 0 photos when complete", async () => {
    const fresh = await createBazaar("draft");
    const incomplete = await submitBazaarForReviewWith(fresh.client, fresh.bazaarId);
    expect(incomplete.ok).toBe(false);
    if (!incomplete.ok) {
      expect(incomplete.code).toBe("BAZAAR_INCOMPLETE");
      expect(incomplete.error).toMatch(/datos públicos/);
      expect(incomplete.error).toMatch(/4 documentos/);
      expect(incomplete.error).toMatch(/3 referencias/);
    }

    expect((await saveBazaarProposalWith(fresh.client, fresh.bazaarId, proposal)).ok).toBe(true);
    for (const type of ["id_card", "selfie", "proof_of_address"] as const) {
      const result = await setBazaarDocumentWith(fresh.client, fresh.bazaarId, {
        type,
        documentPath: await uploadDocument(fresh, type),
      });
      expect(result.ok).toBe(true);
    }
    expect((await saveBazaarReferencesWith(fresh.client, fresh.bazaarId, references)).ok).toBe(true);

    const missingOne = await submitBazaarForReviewWith(fresh.client, fresh.bazaarId);
    expect(missingOne.ok).toBe(false);
    if (!missingOne.ok) expect(missingOne.error).toMatch(/4 documentos/);

    await setBazaarDocumentWith(fresh.client, fresh.bazaarId, {
      type: "registration_payment",
      documentPath: await uploadDocument(fresh, "registration_payment"),
    });
    const submitted = await submitBazaarForReviewWith(fresh.client, fresh.bazaarId);
    if (!submitted.ok) throw new Error(submitted.error);
    if (submitted.ok) expect(submitted.data.status).toBe("pending_review");

    const open = must(
      await fresh.client.from("bazaar_profile_proposals").select("status").single(),
    );
    expect(open.status).toBe("pending");
  });

  it("customers and anonymous visitors read no bazaar tables", async () => {
    const customer = await createCustomer();
    for (const client of [anonClient(), customer.client]) {
      for (const table of [
        "bazaars",
        "bazaar_profile_proposals",
        "bazaar_documents",
        "bazaar_references",
      ] as const) {
        expect(must(await client.from(table).select("id"))).toEqual([]);
      }
    }
  });

  it("references are private to the bazaar and the collector", async () => {
    const mine = must(await other.client.from("bazaar_references").select("bazaar_id"));
    expect(new Set(mine.map((r) => r.bazaar_id))).toEqual(new Set([other.bazaarId]));
    const byCollector = must(
      await collector.client.from("bazaar_references").select("id").eq("bazaar_id", other.bazaarId),
    );
    expect(byCollector).toHaveLength(3);
  });
});
