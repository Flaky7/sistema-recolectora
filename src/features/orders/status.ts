import type { Database } from "@/lib/supabase/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type TransitionActor = "customer" | "collector" | "system";

export type OrderTransition = {
  from: OrderStatus;
  to: OrderStatus;
  actor: TransitionActor;
};

/**
 * Allowed order status changes. Identical to public.order_status_transitions
 * (checked by tests/integration/order-status-sync.test.ts).
 */
export const ORDER_TRANSITIONS: readonly OrderTransition[] = [
  { from: "registered", to: "payment_pending", actor: "system" },
  { from: "registered", to: "payment_confirmed", actor: "system" },
  { from: "payment_pending", to: "payment_confirmed", actor: "system" },
  { from: "payment_pending", to: "registered", actor: "system" },
  { from: "payment_pending", to: "receiving", actor: "system" },
  { from: "payment_confirmed", to: "receiving", actor: "system" },
  { from: "receiving", to: "complete", actor: "collector" },
  { from: "complete", to: "shipped", actor: "system" },
  { from: "shipped", to: "delivered", actor: "collector" },
  { from: "registered", to: "cancelled", actor: "customer" },
  { from: "payment_pending", to: "cancelled", actor: "customer" },
  { from: "registered", to: "cancelled", actor: "collector" },
  { from: "payment_pending", to: "cancelled", actor: "collector" },
  { from: "payment_confirmed", to: "cancelled", actor: "collector" },
  { from: "receiving", to: "cancelled", actor: "collector" },
  { from: "complete", to: "cancelled", actor: "collector" },
  { from: "registered", to: "cancelled", actor: "system" },
  { from: "payment_pending", to: "cancelled", actor: "system" },
  { from: "payment_confirmed", to: "cancelled", actor: "system" },
  { from: "receiving", to: "cancelled", actor: "system" },
  { from: "complete", to: "cancelled", actor: "system" },
];

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): boolean {
  return ORDER_TRANSITIONS.some(
    (t) =>
      t.from === from &&
      t.to === to &&
      (t.actor === actor || actor === "system"),
  );
}

/** Statuses in which the customer may still edit bazaars, description and expected packages. */
export const EDITABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  "registered",
  "payment_pending",
  "payment_confirmed",
  "receiving",
];

/** Orders that still accept packages. */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "registered",
  "payment_pending",
  "payment_confirmed",
  "receiving",
  "complete",
];

export function isEditableOrder(status: OrderStatus): boolean {
  return EDITABLE_ORDER_STATUSES.includes(status);
}
