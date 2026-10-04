import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatMoney, toCents } from "@/lib/format";
import {
  isValidCustomerCode,
  normalizeCustomerCode,
} from "@/lib/validation/customer-code";
import { customerCode, password, phone } from "@/lib/validation/messages";
import {
  isValidPhone,
  normalizePhone,
  toWhatsAppNumber,
} from "@/lib/validation/phone";

describe("phone", () => {
  it.each([
    ["6641234567", "6641234567"],
    ["(664) 123-4567", "6641234567"],
    ["+52 664 123 4567", "6641234567"],
    ["+52 1 664 123 4567", "6641234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("accepts only 10 digits", () => {
    expect(isValidPhone("664123456")).toBe(false);
    expect(isValidPhone("66412345678")).toBe(false);
    expect(isValidPhone("664 123 4567")).toBe(true);
  });

  it("builds the international number for wa.me", () => {
    expect(toWhatsAppNumber("664-123-4567")).toBe("526641234567");
    expect(() => toWhatsAppNumber("123")).toThrow();
  });

  it("schema returns the normalized number or a Spanish error", () => {
    expect(phone.parse("(664) 123-4567")).toBe("6641234567");
    const result = phone.safeParse("123");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Escribe un número de 10 dígitos.",
    );
  });
});

describe("customer code", () => {
  it("normalizes case, spaces and hyphens", () => {
    expect(normalizeCustomerCode(" k7m-4p ")).toBe("K7M4P");
  });

  it("rejects ambiguous characters and wrong lengths", () => {
    expect(isValidCustomerCode("K7M4P")).toBe(true);
    expect(isValidCustomerCode("K0M4P")).toBe(false); // 0
    expect(isValidCustomerCode("KOM4P")).toBe(false); // O
    expect(isValidCustomerCode("K1M4P")).toBe(false); // 1
    expect(isValidCustomerCode("KIM4P")).toBe(false); // I
    expect(isValidCustomerCode("K7M4")).toBe(false);
    expect(isValidCustomerCode("K7M4PP")).toBe(false);
  });

  it("schema returns the normalized code", () => {
    expect(customerCode.parse("k7m 4p")).toBe("K7M4P");
    expect(customerCode.safeParse("K0M4P").success).toBe(false);
  });
});

describe("password", () => {
  it("requires 8 characters with letters and digits", () => {
    expect(password.safeParse("abc12345").success).toBe(true);
    expect(password.safeParse("abcdefgh").success).toBe(false);
    expect(password.safeParse("12345678").success).toBe(false);
    expect(password.safeParse("ab1").success).toBe(false);
  });
});

describe("money", () => {
  it("formats cents as Mexican pesos", () => {
    expect(formatMoney(12345)).toBe("$123.45");
    expect(formatMoney(100000)).toBe("$1,000.00");
  });

  it.each([
    ["123", 12300],
    ["123.4", 12340],
    ["123.45", 12345],
    ["$1,000", 100000],
    ["0", 0],
  ])("converts %s pesos to cents", (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-5"])("rejects %s", (input) => {
    expect(toCents(input)).toBeNull();
  });
});

describe("dates", () => {
  it("uses dd/mm/aaaa in America/Tijuana", () => {
    // 2026-10-05 05:30 UTC is still October 4 in Tijuana (UTC-7 in October).
    expect(formatDate("2026-10-05T05:30:00Z")).toBe("04/10/2026");
    expect(formatDateTime("2026-10-05T05:30:00Z")).toBe("04/10/2026 22:30");
  });
});
