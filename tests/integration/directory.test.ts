import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  saveBazaarProposalWith,
  submitBazaarProposalWith,
} from "@/features/bazaars/service";

import { createBazaar } from "../helpers/fixtures";
import {
  adminClient,
  anonClient,
  must,
  resetTestData,
} from "../helpers/supabase";

const tag = Math.random().toString(36).slice(2, 7);
let approvedId: string;

beforeAll(async () => {
  const approved = await createBazaar("approved");
  approvedId = approved.bazaarId;
  must(
    await adminClient()
      .from("bazaars")
      .update({ name: `ZÁRA Ñandú ${tag}`, brands: ["Bershka", `Marca${tag}`] })
      .eq("id", approvedId),
  );
  // The same unique text in bazaars that must never appear.
  for (const status of [
    "draft",
    "pending_review",
    "rejected",
    "suspended",
  ] as const) {
    const other = await createBazaar(status);
    must(
      await adminClient()
        .from("bazaars")
        .update({ name: `Oculto ${tag} ${status}`, brands: [`Marca${tag}`] })
        .eq("id", other.bazaarId)
        .in("status", ["approved", "suspended"]),
    );
  }
});

afterAll(resetTestData);

describe("search_directory (US6, FR-035 to FR-037)", () => {
  it("returns only approved bazaars and only public columns", async () => {
    const rows = must(
      await anonClient().rpc("search_directory", { q: `marca${tag}` }),
    );
    expect(rows.map((r) => r.id)).toEqual([approvedId]);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "brands",
      "id",
      "link_url",
      "name",
      "photo_paths",
    ]);
  });

  it("ignores accents and case, and finds by name or brand", async () => {
    const anon = anonClient();
    expect(
      must(await anon.rpc("search_directory", { q: `zara nandu ${tag}` })).map(
        (r) => r.id,
      ),
    ).toEqual([approvedId]);
    const byBrand = must(await anon.rpc("search_directory", { q: "bershka" }));
    expect(byBrand.map((r) => r.id)).toContain(approvedId);
  });

  it("a bazaar without photos returns an empty photo list", async () => {
    const rows = must(
      await anonClient().rpc("search_directory", { q: `marca${tag}` }),
    );
    expect(rows[0]?.photo_paths).toEqual([]);
  });

  it("a pending proposal does not change what the directory shows", async () => {
    const bazaar = await createBazaar("approved");
    const before = must(
      await adminClient()
        .from("bazaars")
        .select("name")
        .eq("id", bazaar.bazaarId)
        .single(),
    );
    await saveBazaarProposalWith(bazaar.client, bazaar.bazaarId, {
      name: `Propuesta ${tag}`,
      brands: ["Nueva"],
      linkUrl: "https://nueva.mx",
      photoPaths: [],
    });
    await submitBazaarProposalWith(bazaar.client, bazaar.bazaarId);
    expect(
      must(
        await anonClient().rpc("search_directory", { q: `propuesta ${tag}` }),
      ),
    ).toEqual([]);
    const all = must(await anonClient().rpc("search_directory", { q: "" }));
    expect(all.find((r) => r.id === bazaar.bazaarId)?.name).toBe(before.name);
  });

  it("an empty search lists approved bazaars; no match returns nothing", async () => {
    const all = must(await anonClient().rpc("search_directory", {}));
    expect(all.map((r) => r.id)).toContain(approvedId);
    expect(
      must(
        await anonClient().rpc("search_directory", {
          q: "zzzz-no-existe-zzzz",
        }),
      ),
    ).toEqual([]);
  });

  it("LIKE wildcards typed by the visitor are literal", async () => {
    expect(
      must(await anonClient().rpc("search_directory", { q: "%" })),
    ).toEqual([]);
    expect(
      must(await anonClient().rpc("search_directory", { q: "_" })),
    ).toEqual([]);
  });

  it("anonymous visitors cannot select the bazaars table directly", async () => {
    expect(must(await anonClient().from("bazaars").select("id"))).toEqual([]);
  });
});
