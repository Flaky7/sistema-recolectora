/** The only module that knows about WhatsApp (contracts/notifications.md, research R10). */

export type NotificationKind =
  | "package_received"
  | "package_unassigned"
  | "payment_confirmed"
  | "payment_rejected"
  | "order_shipped";

export interface OutgoingNotification {
  kind: NotificationKind;
  /** 10-digit Mexican number. */
  toPhone: string;
  /** Final text. */
  body: string;
}

export type DeliveryResult =
  /** Phase 1: the collector confirms sending in WhatsApp. */
  | { kind: "open_url"; url: string }
  /** Phase 2: WhatsApp Cloud API (not implemented). */
  | { kind: "sent"; providerId: string };

export interface NotificationChannel {
  name: "whatsapp_link" | "whatsapp_cloud";
  deliver(notification: OutgoingNotification): Promise<DeliveryResult>;
}
