import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  reviewBazaarProposalWith,
  reviewBazaarWith,
  saveBazaarProposalWith,
  submitBazaarProposalWith,
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

let collector: TestUser;

beforeAll(async () => {
  collector = await createTestUser("collector");
});

afterAll(resetTestData);

const jpeg = () =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

async function uploadSubmission(bazaar: BazaarUser) {
  const path = `${bazaar.bazaarId}/${crypto.randomUUID()}.jpg`;
  must(
    await bazaar.client.storage
      .from("bazaar-photo-submissions")
      .upload(path, jpeg()),
  );
  return path;
}

async function exists(bucket: string, path: string) {
  const [folder, name] = path.split("/") as [string, string];
  const { data } = await adminClient()
    .storage.from(bucket)
    .list(folder, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

async function directory(q: string) {
  return must(await anonClient().rpc("search_directory", { q }));
}

describe("bazaar review (US5, FR-027 to FR-031)", () => {
  it("only the collector changes the status, with valid transitions and reasons", async () => {
    const bazaar = await createBazaar("pending_review");
    const customer = await createCustomer();
    await customer.client
      .from("bazaars")
      .update({ status: "approved" })
      .eq("id", bazaar.bazaarId);
    expect(
      must(
        await adminClient()
          .from("bazaars")
          .select("status")
          .eq("id", bazaar.bazaarId)
          .single(),
      ).status,
    ).toBe("pending_review");

    const noReason = await collector.client
      .from("bazaars")
      .update({ status: "rejected" })
      .eq("id", bazaar.bazaarId);
    expect(noReason.error).not.toBeNull();

    const draft = await createBazaar("draft", { complete: true });
    const skip = await collector.client
      .from("bazaars")
      .update({
        status: "approved",
        name: "X",
        brands: ["Y"],
        link_url: "https://x.mx",
      })
      .eq("id", draft.bazaarId);
    expect(skip.error?.message).toMatch(/no permitido/);
  });

  it("approving publishes the proposal with its photos; the private copy is removed", async () => {
    const bazaar = await createBazaar("draft", {
      complete: true,
      name: "Bazar Fotogénico Único",
    });
    const photo = await uploadSubmission(bazaar);
    const draft = must(
      await bazaar.client
        .from("bazaar_profile_proposals")
        .select()
        .eq("status", "draft")
        .single(),
    );
    expect(
      (
        await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
          name: draft.name,
          brands: ["Fotogénica"],
          linkUrl: draft.link_url,
          photoPaths: [photo],
        })
      ).ok,
    ).toBe(true);
    must(
      await bazaar.client
        .from("bazaars")
        .update({ status: "pending_review" })
        .eq("id", bazaar.bazaarId),
    );

    // Collector can open the private photo; nobody else can, not even with a public URL.
    const signed = await collector.client.storage
      .from("bazaar-photo-submissions")
      .createSignedUrl(photo, 60);
    expect(signed.error).toBeNull();
    expect(await exists("bazaar-photos", photo)).toBe(false);

    const approved = await reviewBazaarWith(
      collector.client,
      bazaar.bazaarId,
      "approve",
    );
    if (!approved.ok) throw new Error(approved.error);
    expect(approved.data.status).toBe("approved");
    expect(approved.data.name).toBe("Bazar Fotogénico Único");

    expect(await exists("bazaar-photos", photo)).toBe(true);
    expect(await exists("bazaar-photo-submissions", photo)).toBe(false);
    const listed = await directory("fotogenica");
    expect(listed.map((b) => b.id)).toContain(bazaar.bazaarId);
    expect(listed.find((b) => b.id === bazaar.bazaarId)?.photo_paths).toEqual([
      photo,
    ]);

    const docs = must(
      await adminClient()
        .from("bazaar_documents")
        .select("status")
        .eq("bazaar_id", bazaar.bazaarId),
    );
    expect(docs.every((d) => d.status === "current")).toBe(true);
  });

  it("a change from an approved bazaar is invisible until authorized, then replaces old photos", async () => {
    const bazaar = await createBazaar("draft", {
      complete: true,
      name: "Bazar Cambiante Único",
    });
    const oldPhoto = await uploadSubmission(bazaar);
    const draft = must(
      await bazaar.client
        .from("bazaar_profile_proposals")
        .select()
        .eq("status", "draft")
        .single(),
    );
    await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
      name: draft.name,
      brands: draft.brands,
      linkUrl: draft.link_url,
      photoPaths: [oldPhoto],
    });
    must(
      await bazaar.client
        .from("bazaars")
        .update({ status: "pending_review" })
        .eq("id", bazaar.bazaarId),
    );
    expect(
      (await reviewBazaarWith(collector.client, bazaar.bazaarId, "approve")).ok,
    ).toBe(true);

    const newPhoto = await uploadSubmission(bazaar);
    expect(
      (
        await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
          name: "Bazar Cambiado Único",
          brands: ["Nueva"],
          linkUrl: "https://www.facebook.com/cambiado",
          photoPaths: [newPhoto],
        })
      ).ok,
    ).toBe(true);
    const sent = await submitBazaarProposalWith(bazaar.client, bazaar.bazaarId);
    if (!sent.ok) throw new Error(sent.error);

    // Directory still shows the published version.
    const before = await directory("cambiante");
    expect(before.find((b) => b.id === bazaar.bazaarId)?.name).toBe(
      "Bazar Cambiante Único",
    );
    expect(await exists("bazaar-photos", newPhoto)).toBe(false);

    const noReason = await reviewBazaarProposalWith(
      collector.client,
      sent.data.id,
      "reject",
      "",
    );
    expect(noReason.ok).toBe(false);

    const asBazaar = await bazaar.client.rpc("apply_bazaar_proposal", {
      proposal_id: sent.data.id,
      public_paths: [newPhoto],
    });
    expect(asBazaar.error).not.toBeNull();

    const approved = await reviewBazaarProposalWith(
      collector.client,
      sent.data.id,
      "approve",
    );
    if (!approved.ok) throw new Error(approved.error);
    const after = await directory("cambiado");
    const row = after.find((b) => b.id === bazaar.bazaarId);
    expect(row?.name).toBe("Bazar Cambiado Único");
    expect(row?.photo_paths).toEqual([newPhoto]);
    expect(await exists("bazaar-photos", oldPhoto)).toBe(false);
    expect(await exists("bazaar-photos", newPhoto)).toBe(true);
  });

  it("keeping a published photo in a change does not copy or delete it", async () => {
    const bazaar = await createBazaar("draft", {
      complete: true,
      name: "Bazar Conserva Único",
    });
    const photo = await uploadSubmission(bazaar);
    const draft = must(
      await bazaar.client
        .from("bazaar_profile_proposals")
        .select()
        .eq("status", "draft")
        .single(),
    );
    await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
      name: draft.name,
      brands: draft.brands,
      linkUrl: draft.link_url,
      photoPaths: [photo],
    });
    must(
      await bazaar.client
        .from("bazaars")
        .update({ status: "pending_review" })
        .eq("id", bazaar.bazaarId),
    );
    await reviewBazaarWith(collector.client, bazaar.bazaarId, "approve");

    await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
      name: "Bazar Conserva Único",
      brands: ["Otra marca"],
      linkUrl: draft.link_url,
      photoPaths: [photo],
    });
    const sent = await submitBazaarProposalWith(bazaar.client, bazaar.bazaarId);
    if (!sent.ok) throw new Error(sent.error);
    expect(
      (
        await reviewBazaarProposalWith(
          collector.client,
          sent.data.id,
          "approve",
        )
      ).ok,
    ).toBe(true);
    expect(await exists("bazaar-photos", photo)).toBe(true);
    const row = (await directory("conserva")).find(
      (b) => b.id === bazaar.bazaarId,
    );
    expect(row?.brands).toEqual(["Otra marca"]);
    expect(row?.photo_paths).toEqual([photo]);
  });

  it("rejecting a change keeps the directory and shows the reason", async () => {
    const bazaar = await createBazaar("approved");
    await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
      name: "Nombre Inapropiado",
      brands: ["X"],
      linkUrl: "https://x.mx",
      photoPaths: [],
    });
    const sent = await submitBazaarProposalWith(bazaar.client, bazaar.bazaarId);
    if (!sent.ok) throw new Error(sent.error);
    const rejected = await reviewBazaarProposalWith(
      collector.client,
      sent.data.id,
      "reject",
      "Nombre no permitido",
    );
    expect(rejected.ok).toBe(true);
    const seen = must(
      await bazaar.client
        .from("bazaar_profile_proposals")
        .select("status, rejection_reason")
        .eq("id", sent.data.id)
        .single(),
    );
    expect(seen).toEqual({
      status: "rejected",
      rejection_reason: "Nombre no permitido",
    });
    const published = must(
      await adminClient()
        .from("bazaars")
        .select("name")
        .eq("id", bazaar.bazaarId)
        .single(),
    );
    expect(published.name).not.toBe("Nombre Inapropiado");
  });

  it("suspending discards the open change and hides the bazaar; reactivating shows it again", async () => {
    const bazaar = await createBazaar("approved", {
      name: "Bazar Suspendible Único",
    });
    await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
      name: "Otro nombre",
      brands: ["X"],
      linkUrl: "https://x.mx",
      photoPaths: [],
    });
    const noReason = await reviewBazaarWith(
      collector.client,
      bazaar.bazaarId,
      "suspend",
    );
    expect(noReason.ok).toBe(false);

    const suspended = await reviewBazaarWith(
      collector.client,
      bazaar.bazaarId,
      "suspend",
      "Fotos inapropiadas",
    );
    expect(suspended.ok).toBe(true);
    const open = must(
      await adminClient()
        .from("bazaar_profile_proposals")
        .select("status")
        .eq("bazaar_id", bazaar.bazaarId)
        .in("status", ["draft", "pending"]),
    );
    expect(open).toEqual([]);
    expect((await directory("suspendible")).map((b) => b.id)).not.toContain(
      bazaar.bazaarId,
    );

    expect(
      (await reviewBazaarWith(collector.client, bazaar.bazaarId, "reactivate"))
        .ok,
    ).toBe(true);
    expect((await directory("suspendible")).map((b) => b.id)).toContain(
      bazaar.bazaarId,
    );
  });

  it("the collector signs documents; bazaars and customers cannot", async () => {
    const bazaar = await createBazaar("pending_review");
    const path = `${bazaar.bazaarId}/selfie-${crypto.randomUUID()}.jpg`;
    must(
      await adminClient().storage.from("bazaar-documents").upload(path, jpeg()),
    );
    expect(
      (
        await collector.client.storage
          .from("bazaar-documents")
          .createSignedUrl(path, 60)
      ).error,
    ).toBeNull();
    expect(
      (
        await bazaar.client.storage
          .from("bazaar-documents")
          .createSignedUrl(path, 60)
      ).error,
    ).not.toBeNull();
    const customer = await createCustomer();
    expect(
      (
        await customer.client.storage
          .from("bazaar-documents")
          .createSignedUrl(path, 60)
      ).error,
    ).not.toBeNull();
  });
});
