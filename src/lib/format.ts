/** Locale settings of the whole app (plan.md, "Configuración regional"). */
export const LOCALE = "es-MX";
export const TIME_ZONE = "America/Tijuana";

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 12345 -> "$123.45" */
export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

/** "dd/mm/aaaa" in America/Tijuana. */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

/** "dd/mm/aaaa hh:mm" in America/Tijuana. */
export function formatDateTime(value: Date | string): string {
  const date = new Date(value);
  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
}

/** "123.45" or "123" (pesos typed by the user) -> 12345 cents. Returns null if invalid. */
export function toCents(pesos: string | number): number | null {
  const text = String(pesos)
    .trim()
    .replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole = "0", fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
