import { toWhatsAppNumber } from "@/lib/validation/phone";

import type { NotificationChannel } from "./types";

/** wa.me link that opens WhatsApp with the text ready; the collector confirms sending it. */
export function buildWhatsAppUrl(phone: string, body: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(body)}`;
}

export const whatsappLinkChannel: NotificationChannel = {
  name: "whatsapp_link",
  async deliver(notification) {
    return {
      kind: "open_url",
      url: buildWhatsAppUrl(notification.toPhone, notification.body),
    };
  },
};
