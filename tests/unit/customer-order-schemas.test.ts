import { describe, expect, it } from "vitest";

import {
  createCustomerSchema,
  signUpCustomerSchema,
} from "@/features/customers/schemas";
import {
  cancelOrderSchema,
  createOrderSchema,
} from "@/features/orders/schemas";
import {
  recordConfirmedPaymentSchema,
  reviewPaymentSchema,
} from "@/features/payments/schemas";

const validSignUp = {
  fullName: "Laura Pérez",
  whatsapp: "664 123 4567",
  shippingAddress: "Calle Uno 123, Tijuana",
  type: "local",
  email: "Laura@Example.com",
  password: "secreta123",
  acceptPrivacy: true,
};

const validOrder = {
  bazaars: [{ bazaarName: "Bazar de Ana" }],
  description: "Dos blusas",
  expectedPackages: 2,
};

describe("signUpCustomerSchema", () => {
  it("accepts valid data and normalizes phone and email", () => {
    const result = signUpCustomerSchema.parse(validSignUp);
    expect(result.whatsapp).toBe("6641234567");
    expect(result.email).toBe("laura@example.com");
    expect(result.customerCode).toBeUndefined();
  });

  it.each([
    ["fullName", "L"],
    ["fullName", "x".repeat(121)],
    ["whatsapp", "66412345"],
    ["shippingAddress", "Corta"],
    ["shippingAddress", "x".repeat(501)],
    ["type", "otra"],
    ["email", "no-es-correo"],
    ["password", "corta1"],
    ["acceptPrivacy", false],
  ])("rejects %s = %j", (field, value) => {
    const result = signUpCustomerSchema.safeParse({ ...validSignUp, [field]: value });
    expect(result.success).toBe(false);
  });

  it("requires accepting the privacy notice", () => {
    const withoutPrivacy: Partial<typeof validSignUp> = { ...validSignUp };
    delete withoutPrivacy.acceptPrivacy;
    expect(signUpCustomerSchema.safeParse(withoutPrivacy).success).toBe(false);
  });

  it("accepts boundary lengths", () => {
    expect(
      signUpCustomerSchema.safeParse({
        ...validSignUp,
        fullName: "Lu",
        shippingAddress: "x".repeat(10),
      }).success,
    ).toBe(true);
    expect(
      signUpCustomerSchema.safeParse({
        ...validSignUp,
        fullName: "x".repeat(120),
        shippingAddress: "x".repeat(500),
      }).success,
    ).toBe(true);
  });

  it("normalizes an optional customer code and rejects ambiguous characters", () => {
    expect(
      signUpCustomerSchema.parse({ ...validSignUp, customerCode: " k7m-4p " }).customerCode,
    ).toBe("K7M4P");
    expect(signUpCustomerSchema.parse({ ...validSignUp, customerCode: "" }).customerCode).toBe(
      undefined,
    );
    expect(
      signUpCustomerSchema.safeParse({ ...validSignUp, customerCode: "O1I00" }).success,
    ).toBe(false);
  });
});

describe("createCustomerSchema", () => {
  it("needs name, WhatsApp, address and type", () => {
    expect(
      createCustomerSchema.safeParse({
        fullName: "Rosa",
        whatsapp: "6642222222",
        shippingAddress: "Av. Siempre Viva 742",
        type: "out_of_town",
      }).success,
    ).toBe(true);
    expect(createCustomerSchema.safeParse({ fullName: "Rosa" }).success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("accepts registered and free-text bazaars", () => {
    const result = createOrderSchema.parse({
      ...validOrder,
      bazaars: [
        { bazaarId: "8d8ac610-566d-4ef0-9c22-186b2a5ed793", bazaarName: "Ñandú" },
        { bazaarName: "  Bazar libre  " },
      ],
    });
    expect(result.bazaars).toEqual([
      { bazaarId: "8d8ac610-566d-4ef0-9c22-186b2a5ed793" },
      { bazaarName: "Bazar libre" },
    ]);
  });

  it("requires at least one bazaar", () => {
    expect(createOrderSchema.safeParse({ ...validOrder, bazaars: [] }).success).toBe(false);
  });

  it.each([
    ["description", "ab"],
    ["description", "x".repeat(2001)],
    ["expectedPackages", 0],
    ["expectedPackages", 100],
    ["expectedPackages", 1.5],
    ["expectedPackages", Number.NaN],
  ])("rejects %s = %j", (field, value) => {
    expect(createOrderSchema.safeParse({ ...validOrder, [field]: value }).success).toBe(false);
  });

  it.each([["B"], ["x".repeat(81)]])("rejects a free-text bazaar named %j", (name) => {
    expect(
      createOrderSchema.safeParse({ ...validOrder, bazaars: [{ bazaarName: name }] }).success,
    ).toBe(false);
  });

  it("accepts boundaries", () => {
    expect(
      createOrderSchema.safeParse({
        bazaars: [{ bazaarName: "Ab" }],
        description: "abc",
        expectedPackages: 1,
      }).success,
    ).toBe(true);
    expect(
      createOrderSchema.safeParse({
        bazaars: [{ bazaarName: "x".repeat(80) }],
        description: "x".repeat(2000),
        expectedPackages: 99,
      }).success,
    ).toBe(true);
  });
});

describe("payments and cancellation", () => {
  it("requires a reason to reject a payment", () => {
    const base = { paymentId: "8d8ac610-566d-4ef0-9c22-186b2a5ed793" };
    expect(reviewPaymentSchema.safeParse({ ...base, decision: "confirm" }).success).toBe(true);
    expect(reviewPaymentSchema.safeParse({ ...base, decision: "reject" }).success).toBe(false);
    expect(
      reviewPaymentSchema.safeParse({ ...base, decision: "reject", reason: "Monto incorrecto" })
        .success,
    ).toBe(true);
  });

  it("requires a positive amount when recording a payment", () => {
    expect(recordConfirmedPaymentSchema.safeParse({ folio: 1, amountCents: 0 }).success).toBe(
      false,
    );
    expect(recordConfirmedPaymentSchema.safeParse({ folio: 1, amountCents: 10000 }).success).toBe(
      true,
    );
  });

  it("requires a reason to cancel", () => {
    expect(cancelOrderSchema.safeParse({ folio: 1, reason: "" }).success).toBe(false);
    expect(cancelOrderSchema.safeParse({ folio: 1, reason: "Ya no lo quiero" }).success).toBe(
      true,
    );
  });
});
