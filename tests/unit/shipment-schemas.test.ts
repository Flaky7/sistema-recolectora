import { describe, expect, it } from "vitest";

import { shipmentTypesFor } from "@/features/shipments/labels";
import { markOrderCompleteSchema, registerShipmentSchema } from "@/features/shipments/schemas";

describe("registerShipmentSchema (FR-021)", () => {
  it("requires carrier (2–60) and tracking number (3–60) for carrier shipments", () => {
    const base = { folio: 1, type: "carrier", costCents: 15000 };
    expect(
      registerShipmentSchema.safeParse({ ...base, carrier: "Estafeta", trackingNumber: "ABC123" })
        .success,
    ).toBe(true);
    expect(registerShipmentSchema.safeParse(base).success).toBe(false);
    expect(
      registerShipmentSchema.safeParse({ ...base, carrier: "E", trackingNumber: "ABC123" }).success,
    ).toBe(false);
    expect(
      registerShipmentSchema.safeParse({ ...base, carrier: "Estafeta", trackingNumber: "AB" })
        .success,
    ).toBe(false);
    expect(
      registerShipmentSchema.safeParse({
        ...base,
        carrier: "x".repeat(61),
        trackingNumber: "ABC123",
      }).success,
    ).toBe(false);
    expect(
      registerShipmentSchema.safeParse({
        ...base,
        carrier: "Estafeta",
        trackingNumber: "x".repeat(61),
      }).success,
    ).toBe(false);
  });

  it("does not require carrier or tracking for in-person delivery or pickup", () => {
    expect(
      registerShipmentSchema.safeParse({ folio: 1, type: "local_delivery", costCents: 0 }).success,
    ).toBe(true);
    expect(
      registerShipmentSchema.safeParse({ folio: 1, type: "local_pickup", costCents: 0 }).success,
    ).toBe(true);
  });

  it("rejects a negative or fractional cost", () => {
    expect(
      registerShipmentSchema.safeParse({ folio: 1, type: "local_pickup", costCents: -1 }).success,
    ).toBe(false);
    expect(
      registerShipmentSchema.safeParse({ folio: 1, type: "local_pickup", costCents: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects unknown types", () => {
    expect(
      registerShipmentSchema.safeParse({ folio: 1, type: "drone", costCents: 0 }).success,
    ).toBe(false);
  });
});

describe("shipmentTypesFor", () => {
  it("offers in-person types only to local customers", () => {
    expect(shipmentTypesFor("out_of_town")).toEqual(["carrier"]);
    expect(shipmentTypesFor("local")).toEqual(["carrier", "local_delivery", "local_pickup"]);
  });
});

describe("markOrderCompleteSchema", () => {
  it("defaults confirmIncomplete to false", () => {
    expect(markOrderCompleteSchema.parse({ folio: 3 }).confirmIncomplete).toBe(false);
  });
});
