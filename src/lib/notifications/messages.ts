import { formatMoney } from "@/lib/format";

import type { NotificationKind } from "./types";

/** Variables each template may use (data-model.md, table settings). */
export const TEMPLATE_VARIABLES: Record<NotificationKind, readonly string[]> = {
  package_received: [
    "nombre",
    "bazar",
    "recibidos",
    "esperados",
    "enlace",
    "folio",
  ],
  package_unassigned: ["nombre", "bazar", "enlace"],
  payment_confirmed: ["nombre", "folio", "monto", "enlace"],
  payment_rejected: ["nombre", "folio", "motivo", "enlace"],
  order_shipped: ["nombre", "folio", "tipo", "paqueteria", "guia", "costo"],
};

const VARIABLE = /\{([a-z_]+)\}/g;

export type TemplateValues = Record<string, string | number | null | undefined>;

function isEmpty(value: TemplateValues[string]): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Replaces {variables}. A line that uses a variable with no value is removed entirely, so the
 * same template works for customers without an account (no {enlace}) and for in-person
 * deliveries (no {paqueteria} or {guia}).
 */
export function renderTemplate(
  template: string,
  values: TemplateValues,
): string {
  return template
    .split("\n")
    .filter((line) =>
      [...line.matchAll(VARIABLE)].every(
        (match) => !isEmpty(values[match[1]!]),
      ),
    )
    .map((line) =>
      line.replace(VARIABLE, (_, name: string) => String(values[name])),
    )
    .join("\n")
    .trim();
}

export type TemplateCheck =
  { valid: true } | { valid: false; unknown: string[]; empty: boolean };

/** Rejects unknown variables when the collector saves a template (FR-040). */
export function validateTemplate(
  kind: NotificationKind,
  template: string,
): TemplateCheck {
  const allowed = TEMPLATE_VARIABLES[kind];
  const unknown = [
    ...new Set([...template.matchAll(VARIABLE)].map((match) => match[1]!)),
  ].filter((name) => !allowed.includes(name));
  const empty = template.trim() === "";
  return unknown.length === 0 && !empty
    ? { valid: true }
    : { valid: false, unknown, empty };
}

export const SHIPMENT_TYPE_TEXT = {
  carrier: "envío por paquetería",
  local_delivery: "entrega en persona",
  local_pickup: "recolección en persona",
} as const;

export function buildPackageReceivedMessage(
  template: string,
  input: {
    customerName: string;
    bazarName: string;
    received: number;
    expected: number;
    folio: number;
    /** Null for customers without an account (FR-045). */
    link: string | null;
  },
): string {
  return renderTemplate(template, {
    nombre: input.customerName,
    bazar: input.bazarName,
    recibidos: input.received,
    esperados: input.expected,
    folio: input.folio,
    enlace: input.link,
  });
}

export function buildPackageUnassignedMessage(
  template: string,
  input: { customerName: string; bazarName: string; link: string | null },
): string {
  return renderTemplate(template, {
    nombre: input.customerName,
    bazar: input.bazarName,
    enlace: input.link,
  });
}

export function buildPaymentConfirmedMessage(
  template: string,
  input: {
    customerName: string;
    folio: number;
    amountCents: number;
    link: string | null;
  },
): string {
  return renderTemplate(template, {
    nombre: input.customerName,
    folio: input.folio,
    monto: formatMoney(input.amountCents),
    enlace: input.link,
  });
}

export function buildPaymentRejectedMessage(
  template: string,
  input: {
    customerName: string;
    folio: number;
    reason: string;
    link: string | null;
  },
): string {
  return renderTemplate(template, {
    nombre: input.customerName,
    folio: input.folio,
    motivo: input.reason,
    enlace: input.link,
  });
}

export function buildOrderShippedMessage(
  template: string,
  input: {
    customerName: string;
    folio: number;
    type: keyof typeof SHIPMENT_TYPE_TEXT;
    carrier: string | null;
    trackingNumber: string | null;
    costCents: number;
  },
): string {
  const isCarrier = input.type === "carrier";
  return renderTemplate(template, {
    nombre: input.customerName,
    folio: input.folio,
    tipo: SHIPMENT_TYPE_TEXT[input.type],
    paqueteria: isCarrier ? input.carrier : null,
    guia: isCarrier ? input.trackingNumber : null,
    costo: formatMoney(input.costCents),
  });
}
