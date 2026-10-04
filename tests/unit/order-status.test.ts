import { describe, expect, it } from "vitest";

import {
  canTransition,
  isEditableOrder,
  ORDER_TRANSITIONS,
} from "@/features/orders/status";

describe("order status machine", () => {
  it.each(ORDER_TRANSITIONS.map((t) => [t.from, t.to, t.actor] as const))(
    "allows %s -> %s by %s",
    (from, to, actor) => {
      expect(canTransition(from, to, actor)).toBe(true);
    },
  );

  it("system may perform any listed change", () => {
    expect(canTransition("receiving", "complete", "system")).toBe(true);
  });

  it.each([
    ["registered", "shipped", "collector"],
    ["registered", "receiving", "system"],
    ["payment_confirmed", "cancelled", "customer"],
    ["receiving", "complete", "customer"],
    ["shipped", "cancelled", "collector"],
    ["delivered", "cancelled", "system"],
    ["cancelled", "registered", "collector"],
  ] as const)("rejects %s -> %s by %s", (from, to, actor) => {
    expect(canTransition(from, to, actor)).toBe(false);
  });

  it("orders are editable until they are complete", () => {
    expect(isEditableOrder("receiving")).toBe(true);
    expect(isEditableOrder("complete")).toBe(false);
    expect(isEditableOrder("cancelled")).toBe(false);
  });
});
