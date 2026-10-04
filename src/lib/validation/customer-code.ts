/** 5 characters without 0/O/1/I so they are easy to write on a label and to dictate (research R4). */
export const CUSTOMER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CUSTOMER_CODE_LENGTH = 5;
export const CUSTOMER_CODE_PATTERN = /^[2-9A-HJ-NP-Z]{5}$/;

/** Uppercases and removes spaces and hyphens: " k7m-4p " -> "K7M4P". */
export function normalizeCustomerCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isValidCustomerCode(input: string): boolean {
  return CUSTOMER_CODE_PATTERN.test(normalizeCustomerCode(input));
}
