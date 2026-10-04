import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { ServerClient } from "@/lib/supabase/server";

import {
  buildOrderShippedMessage,
  buildPackageReceivedMessage,
  buildPackageUnassignedMessage,
  buildPaymentConfirmedMessage,
  buildPaymentRejectedMessage,
  SHIPMENT_TYPE_TEXT,
} from "./messages";
import type {
  DeliveryResult,
  NotificationChannel,
  NotificationKind,
} from "./types";
import { whatsappLinkChannel } from "./whatsapp-link";

/** Phase 1 always uses wa.me links; phase 2 swaps in WhatsApp Cloud here (constitution VIII). */
export function getNotificationChannel(): NotificationChannel {
  return whatsappLinkChannel;
}

export type NotifyCustomer = {
  id: string;
  fullName: string;
  /** Null only for deleted customers; then no message is generated. */
  whatsapp: string | null;
  /** Customers without an account get no link (FR-045). */
  hasAccount: boolean;
};

export type NotifyContext =
  | {
      kind: "package_received";
      customer: NotifyCustomer;
      orderId: string;
      packageId: string;
      folio: number;
      bazarName: string;
      received: number;
      expected: number;
    }
  | {
      kind: "package_unassigned";
      customer: NotifyCustomer;
      packageId: string;
      bazarName: string;
    }
  | {
      kind: "payment_confirmed";
      customer: NotifyCustomer;
      orderId: string;
      paymentId: string;
      folio: number;
      amountCents: number;
    }
  | {
      kind: "payment_rejected";
      customer: NotifyCustomer;
      orderId: string;
      paymentId: string;
      folio: number;
      reason: string;
    }
  | {
      kind: "order_shipped";
      customer: NotifyCustomer;
      orderId: string;
      shipmentId: string;
      folio: number;
      type: keyof typeof SHIPMENT_TYPE_TEXT;
      carrier: string | null;
      trackingNumber: string | null;
      costCents: number;
    };

export function siteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}${path}`;
}

export function orderLink(folio: number): string {
  return siteUrl(`/mi-cuenta/pedidos/${folio}`);
}

const TEMPLATE_COLUMN = {
  package_received: "template_package_received",
  package_unassigned: "template_package_unassigned",
  payment_confirmed: "template_payment_confirmed",
  payment_rejected: "template_payment_rejected",
  order_shipped: "template_order_shipped",
} as const satisfies Record<NotificationKind, string>;

function buildBody(template: string, context: NotifyContext): string {
  const { customer } = context;
  const name = customer.fullName;
  switch (context.kind) {
    case "package_received":
      return buildPackageReceivedMessage(template, {
        customerName: name,
        bazarName: context.bazarName,
        received: context.received,
        expected: context.expected,
        folio: context.folio,
        link: customer.hasAccount ? orderLink(context.folio) : null,
      });
    case "package_unassigned":
      return buildPackageUnassignedMessage(template, {
        customerName: name,
        bazarName: context.bazarName,
        link: customer.hasAccount ? siteUrl("/mi-cuenta") : null,
      });
    case "payment_confirmed":
      return buildPaymentConfirmedMessage(template, {
        customerName: name,
        folio: context.folio,
        amountCents: context.amountCents,
        link: customer.hasAccount ? orderLink(context.folio) : null,
      });
    case "payment_rejected":
      return buildPaymentRejectedMessage(template, {
        customerName: name,
        folio: context.folio,
        reason: context.reason,
        link: customer.hasAccount ? orderLink(context.folio) : null,
      });
    case "order_shipped":
      return buildOrderShippedMessage(template, {
        customerName: name,
        folio: context.folio,
        type: context.type,
        carrier: context.carrier,
        trackingNumber: context.trackingNumber,
        costCents: context.costCents,
      });
  }
}

/**
 * Builds the message from the configured template, stores it in `notifications` and hands it
 * to the active channel. Only the collector calls it (RLS on settings and notifications).
 *
 * The business change already happened when this runs, so a failure here never undoes it:
 * if the row cannot be stored, the message is still returned so the collector can send it.
 */
export async function notify(
  supabase: ServerClient,
  context: NotifyContext,
): Promise<DeliveryResult | null> {
  const phone = context.customer.whatsapp;
  if (!phone) return null;

  const column = TEMPLATE_COLUMN[context.kind];
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select(column)
    .eq("id", 1)
    .single();
  if (settingsError || !settings) {
    Sentry.captureMessage("notify: settings not readable", "error");
    return null;
  }
  const template = (settings as Record<string, string>)[column] ?? "";
  const body = buildBody(template, context);

  const { error } = await supabase.from("notifications").insert({
    customer_id: context.customer.id,
    kind: context.kind,
    channel: "whatsapp_link",
    body,
    order_id: "orderId" in context ? context.orderId : null,
    package_id: "packageId" in context ? context.packageId : null,
    payment_id: "paymentId" in context ? context.paymentId : null,
    shipment_id: "shipmentId" in context ? context.shipmentId : null,
  });
  if (error) {
    Sentry.captureMessage(`notify: insert failed (${error.code})`, "error");
  }

  return getNotificationChannel().deliver({
    kind: context.kind,
    toPhone: phone,
    body,
  });
}

/** Re-delivers a stored message as is (resend button). */
export function redeliver(
  kind: NotificationKind,
  toPhone: string,
  body: string,
): Promise<DeliveryResult> {
  return getNotificationChannel().deliver({ kind, toPhone, body });
}
