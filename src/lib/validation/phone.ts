/** Mexican phone numbers are stored as exactly 10 digits (data-model.md). */
export const PHONE_PATTERN = /^\d{10}$/;

/**
 * Keeps digits only and drops the +52 country code (and the old mobile "1"), so
 * "+52 1 664 123 4567", "(664) 123-4567" and "6641234567" all become "6641234567".
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("521"))
    digits = digits.slice(3);
  if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  return digits;
}

export function isValidPhone(input: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(input));
}

/** Number in the international format wa.me expects: "52" + 10 digits. */
export function toWhatsAppNumber(phone: string): string {
  const digits = normalizePhone(phone);
  if (!PHONE_PATTERN.test(digits)) {
    throw new Error("El número de WhatsApp debe tener 10 dígitos.");
  }
  return `52${digits}`;
}
