import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  reviewBazaarDocumentWith,
  saveBazaarReferencesWith,
  setBazaarDocumentWith,
} from "@/features/bazaars/service";

import { createBazaar } from "../helpers/fixtures";
import {
  adminClient,
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
  new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

async function upload(user: BazaarUser, type: string) {
  const path = `${user.bazaarId}/${type}-${crypto.randomUUID()}.jpg`;
  must(await user.client.storage.from("bazaar-documents").upload(path, jpeg()));
  return path;
}

async function documents(bazaarId: string) {
  return must(
    await adminClient()
      .from("bazaar_documents")
      .select("id, type, status, storage_path, rejection_reason")
      .eq("bazaar_id", bazaarId)
      .eq("type", "proof_of_address"),
  );
}

async function fileExists(path: string) {
  const folder = path.split("/")[0]!;
  const name = path.split("/")[1]!;
  const { data } = await adminClient()
    .storage.from("bazaar-documents")
    .list(folder, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

describe("document versions (FR-032 to FR-034)", () => {
  it("a new upload stays pending while the current one is unchanged; another replaces it", async () => {
    const bazaar = await createBazaar("approved");
    const before = await documents(bazaar.bazaarId);
    expect(before.map((d) => d.status)).toEqual(["current"]);

    const first = await upload(bazaar, "proof_of_address");
    expect(
      (
        await setBazaarDocumentWith(bazaar.client, bazaar.bazaarId, {
          type: "proof_of_address",
          documentPath: first,
        })
      ).ok,
    ).toBe(true);
    const second = await upload(bazaar, "proof_of_address");
    expect(
      (
        await setBazaarDocumentWith(bazaar.client, bazaar.bazaarId, {
          type: "proof_of_address",
          documentPath: second,
        })
      ).ok,
    ).toBe(true);

    const after = await documents(bazaar.bazaarId);
    expect(after.map((d) => d.status).sort()).toEqual(["current", "pending"]);
    expect(after.find((d) => d.status === "current")?.storage_path).toBe(
      before[0]!.storage_path,
    );
    expect(after.find((d) => d.status === "pending")?.storage_path).toBe(
      second,
    );

    // The replaced file waits in the trash until the collector reviews (research R23).
    expect(await fileExists(first)).toBe(true);
    const pending = after.find((d) => d.status === "pending")!;
    await reviewBazaarDocumentWith(collector.client, pending.id, "approve");
    expect(await fileExists(first)).toBe(false);
    const trash = must(
      await adminClient()
        .from("storage_trash")
        .select("id")
        .eq("bazaar_id", bazaar.bazaarId),
    );
    expect(trash).toEqual([]);
  });

  it("approving leaves a single current document and deletes the previous file", async () => {
    const bazaar = await createBazaar("approved");
    const oldCurrent = (await documents(bazaar.bazaarId))[0]!;
    // Seed-like fixtures reference files that do not exist; upload one so deletion is visible.
    must(
      await adminClient()
        .storage.from("bazaar-documents")
        .upload(oldCurrent.storage_path!, jpeg()),
    );

    const path = await upload(bazaar, "proof_of_address");
    await setBazaarDocumentWith(bazaar.client, bazaar.bazaarId, {
      type: "proof_of_address",
      documentPath: path,
    });
    const pending = (await documents(bazaar.bazaarId)).find(
      (d) => d.status === "pending",
    )!;

    const asBazaar = await bazaar.client.rpc("approve_bazaar_document", {
      document_id: pending.id,
    });
    expect(asBazaar.error).not.toBeNull();

    const approved = await reviewBazaarDocumentWith(
      collector.client,
      pending.id,
      "approve",
    );
    expect(approved.ok).toBe(true);
    const after = await documents(bazaar.bazaarId);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ status: "current", storage_path: path });
    expect(await fileExists(oldCurrent.storage_path!)).toBe(false);
  });

  it("rejecting needs a reason, keeps the current one and deletes the rejected file", async () => {
    const bazaar = await createBazaar("approved");
    const current = (await documents(bazaar.bazaarId))[0]!;
    const path = await upload(bazaar, "proof_of_address");
    await setBazaarDocumentWith(bazaar.client, bazaar.bazaarId, {
      type: "proof_of_address",
      documentPath: path,
    });
    const pending = (await documents(bazaar.bazaarId)).find(
      (d) => d.status === "pending",
    )!;

    const noReason = await reviewBazaarDocumentWith(
      collector.client,
      pending.id,
      "reject",
      "",
    );
    expect(noReason.ok).toBe(false);

    const rejected = await reviewBazaarDocumentWith(
      collector.client,
      pending.id,
      "reject",
      "No se lee la dirección",
    );
    expect(rejected.ok).toBe(true);
    const after = await documents(bazaar.bazaarId);
    expect(after.find((d) => d.status === "current")?.id).toBe(current.id);
    expect(after.find((d) => d.status === "rejected")).toMatchObject({
      storage_path: null,
      rejection_reason: "No se lee la dirección",
    });
    expect(await fileExists(path)).toBe(false);

    // The bazaar sees the reason of its own rejected document (FR-034).
    const visible = must(
      await bazaar.client
        .from("bazaar_documents")
        .select("status, rejection_reason")
        .eq("status", "rejected"),
    );
    expect(visible[0]?.rejection_reason).toBe("No se lee la dirección");

    // Only the last rejection per type is kept.
    const again = await upload(bazaar, "proof_of_address");
    await setBazaarDocumentWith(bazaar.client, bazaar.bazaarId, {
      type: "proof_of_address",
      documentPath: again,
    });
    const next = (await documents(bazaar.bazaarId)).find(
      (d) => d.status === "pending",
    )!;
    await reviewBazaarDocumentWith(
      collector.client,
      next.id,
      "reject",
      "Sigue sin leerse",
    );
    expect(
      (await documents(bazaar.bazaarId)).filter((d) => d.status === "rejected"),
    ).toHaveLength(1);
  });

  it("approving the bazaar turns all its pending documents into current ones", async () => {
    const bazaar = await createBazaar("pending_review");
    const before = must(
      await adminClient()
        .from("bazaar_documents")
        .select("status")
        .eq("bazaar_id", bazaar.bazaarId),
    );
    expect(before.every((d) => d.status === "pending")).toBe(true);

    const proposal = must(
      await adminClient()
        .from("bazaar_profile_proposals")
        .select("id")
        .eq("bazaar_id", bazaar.bazaarId)
        .eq("status", "pending")
        .single(),
    );
    must(
      await collector.client.rpc("apply_bazaar_proposal", {
        proposal_id: proposal.id,
        public_paths: [],
      }),
    );
    must(
      await collector.client
        .from("bazaars")
        .update({ status: "approved" })
        .eq("id", bazaar.bazaarId),
    );

    const after = must(
      await adminClient()
        .from("bazaar_documents")
        .select("status")
        .eq("bazaar_id", bazaar.bazaarId),
    );
    expect(after).toHaveLength(4);
    expect(after.every((d) => d.status === "current")).toBe(true);
  });

  it("a suspended bazaar cannot upload documents but can update its references", async () => {
    const bazaar = await createBazaar("suspended");
    const path = `${bazaar.bazaarId}/selfie-${crypto.randomUUID()}.jpg`;
    const upload = await bazaar.client.storage
      .from("bazaar-documents")
      .upload(path, jpeg());
    expect(upload.error).not.toBeNull();
    const row = await setBazaarDocumentWith(bazaar.client, bazaar.bazaarId, {
      type: "selfie",
      documentPath: path,
    });
    expect(row.ok).toBe(false);

    const refs = await saveBazaarReferencesWith(
      bazaar.client,
      bazaar.bazaarId,
      [
        { fullName: "Nueva Uno", phone: "6641110001" },
        { fullName: "Nueva Dos", phone: "6641110002" },
        { fullName: "Nueva Tres", phone: "6641110003" },
      ],
    );
    expect(refs.ok).toBe(true);
  });
});
