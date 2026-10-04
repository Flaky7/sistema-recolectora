import { describe, expect, it } from "vitest";

import { assignPackageSchema, registerPackageSchema } from "@/features/packages/schemas";

const id = "8d8ac610-566d-4ef0-9c22-186b2a5ed793";
const valid = {
  customerId: id,
  orderId: id,
  bazaarName: "Bazar de Ana",
  photoPath: `${id}/foto.jpg`,
};

describe("registerPackageSchema", () => {
  it("accepts a package for a customer's order", () => {
    expect(registerPackageSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the photo", () => {
    expect(registerPackageSchema.safeParse({ ...valid, photoPath: "" }).success).toBe(false);
    expect(registerPackageSchema.safeParse({ ...valid, photoPath: undefined }).success).toBe(
      false,
    );
  });

  it("requires a registered bazaar or a typed name of 2 to 80 characters", () => {
    expect(
      registerPackageSchema.safeParse({ ...valid, bazaarName: undefined, bazaarId: id }).success,
    ).toBe(true);
    expect(registerPackageSchema.safeParse({ ...valid, bazaarName: undefined }).success).toBe(
      false,
    );
    expect(registerPackageSchema.safeParse({ ...valid, bazaarName: "A" }).success).toBe(false);
    expect(
      registerPackageSchema.safeParse({ ...valid, bazaarName: "x".repeat(81) }).success,
    ).toBe(false);
  });

  it("accepts notes up to 500 characters and turns an empty note into undefined", () => {
    expect(registerPackageSchema.safeParse({ ...valid, note: "x".repeat(500) }).success).toBe(
      true,
    );
    expect(registerPackageSchema.safeParse({ ...valid, note: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(registerPackageSchema.parse({ ...valid, note: "  " }).note).toBeUndefined();
  });

  it("allows a package without order (sin pedido) and without customer (sin identificar)", () => {
    expect(registerPackageSchema.safeParse({ ...valid, orderId: undefined }).success).toBe(true);
    expect(
      registerPackageSchema.safeParse({ ...valid, orderId: undefined, customerId: undefined })
        .success,
    ).toBe(true);
  });

  it("rejects an order without a customer", () => {
    expect(registerPackageSchema.safeParse({ ...valid, customerId: undefined }).success).toBe(
      false,
    );
  });
});

describe("assignPackageSchema", () => {
  it("needs the package and the customer; the order is optional", () => {
    expect(assignPackageSchema.safeParse({ packageId: id, customerId: id }).success).toBe(true);
    expect(assignPackageSchema.safeParse({ packageId: id }).success).toBe(false);
  });
});
