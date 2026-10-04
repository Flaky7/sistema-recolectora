import { describe, expect, it } from "vitest";

import {
  bazaarProposalSchema,
  bazaarReferencesSchema,
  photosBelongTo,
  reviewBazaarSchema,
  signUpBazaarSchema,
} from "@/features/bazaars/schemas";

const bazaarId = "8d8ac610-566d-4ef0-9c22-186b2a5ed793";
const valid = {
  name: "Bazar Ñandú",
  brands: ["Zara", "Mango"],
  linkUrl: "https://www.facebook.com/bazarnandu",
  photoPaths: [],
};

describe("bazaarProposalSchema (FR-024)", () => {
  it("accepts a profile without photos", () => {
    expect(bazaarProposalSchema.parse({ ...valid, photoPaths: undefined }).photoPaths).toEqual([]);
  });

  it.each([
    ["name", "B"],
    ["name", "x".repeat(81)],
    ["brands", []],
    ["brands", Array.from({ length: 31 }, (_, i) => `Marca ${i}`)],
    ["brands", ["x".repeat(41)]],
    ["brands", [" "]],
    ["linkUrl", "http://facebook.com/bazar"],
    ["linkUrl", "facebook.com/bazar"],
    ["photoPaths", ["a", "b", "c", "d"]],
  ])("rejects %s = %j", (field, value) => {
    expect(bazaarProposalSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });

  it("accepts boundaries: 2 and 80 characters, 30 brands of 40, 3 photos", () => {
    expect(
      bazaarProposalSchema.safeParse({
        name: "Ab",
        brands: Array.from({ length: 30 }, () => "x".repeat(40)),
        linkUrl: "https://a.mx",
        photoPaths: ["a", "b", "c"],
      }).success,
    ).toBe(true);
    expect(bazaarProposalSchema.safeParse({ ...valid, name: "x".repeat(80) }).success).toBe(true);
  });
});

describe("photosBelongTo", () => {
  it("requires every photo inside the bazaar's folder", () => {
    expect(photosBelongTo([`${bazaarId}/foto-1.jpg`], bazaarId)).toBe(true);
    expect(photosBelongTo([], bazaarId)).toBe(true);
    expect(photosBelongTo(["otro/foto.jpg"], bazaarId)).toBe(false);
    expect(photosBelongTo([`${bazaarId}/../x.jpg`], bazaarId)).toBe(false);
    expect(photosBelongTo([`${bazaarId}/sub/x.jpg`], bazaarId)).toBe(false);
  });
});

describe("bazaarReferencesSchema", () => {
  const ref = { fullName: "Ana López", phone: "664 123 4567" };

  it("requires exactly 3 references", () => {
    expect(bazaarReferencesSchema.safeParse({ references: [ref, ref, ref] }).success).toBe(true);
    expect(bazaarReferencesSchema.safeParse({ references: [ref, ref] }).success).toBe(false);
    expect(bazaarReferencesSchema.safeParse({ references: [ref, ref, ref, ref] }).success).toBe(
      false,
    );
  });

  it("validates name (2–120) and a 10-digit phone", () => {
    const bad = [
      { ...ref, fullName: "A" },
      { ...ref, fullName: "x".repeat(121) },
      { ...ref, phone: "12345" },
    ];
    for (const reference of bad) {
      expect(
        bazaarReferencesSchema.safeParse({ references: [reference, ref, ref] }).success,
      ).toBe(false);
    }
    expect(bazaarReferencesSchema.parse({ references: [ref, ref, ref] }).references[0]?.phone).toBe(
      "6641234567",
    );
  });
});

describe("signUpBazaarSchema and reviewBazaarSchema", () => {
  it("requires accepting the privacy notice", () => {
    expect(
      signUpBazaarSchema.safeParse({ email: "a@b.mx", password: "secreta123", acceptPrivacy: false })
        .success,
    ).toBe(false);
  });

  it("requires a reason to reject or suspend", () => {
    const base = { bazaarId };
    expect(reviewBazaarSchema.safeParse({ ...base, decision: "approve" }).success).toBe(true);
    expect(reviewBazaarSchema.safeParse({ ...base, decision: "reject" }).success).toBe(false);
    expect(reviewBazaarSchema.safeParse({ ...base, decision: "suspend" }).success).toBe(false);
    expect(
      reviewBazaarSchema.safeParse({ ...base, decision: "suspend", reason: "Fotos inapropiadas" })
        .success,
    ).toBe(true);
  });
});
