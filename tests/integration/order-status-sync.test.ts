import { afterAll, describe, expect, it } from "vitest";

import { ORDER_TRANSITIONS } from "@/features/orders/status";

import { createCustomer, createOrder, getOrder } from "../helpers/fixtures";
import {
  adminClient,
  createTestUser,
  must,
  resetTestData,
} from "../helpers/supabase";

afterAll(resetTestData);

describe("order_status_transitions", () => {
  it("matches src/features/orders/status.ts exactly", async () => {
    const rows = must(
      await adminClient()
        .from("order_status_transitions")
        .select("from_status, to_status, actor"),
    );
    const key = (from: string, to: string, actor: string) =>
      `${from}>${to}:${actor}`;
    const database = rows
      .map((r) => key(r.from_status, r.to_status, r.actor))
      .sort();
    const code = ORDER_TRANSITIONS.map((t) =>
      key(t.from, t.to, t.actor),
    ).sort();
    expect(database).toEqual(code);
  });

  it("is not readable through the API by app users", async () => {
    const collector = await createTestUser("collector");
    const { data } = await collector.client
      .from("order_status_transitions")
      .select();
    expect(data).toEqual([]);
  });

  it("rejects a change that is not listed", async () => {
    const collector = await createTestUser("collector");
    const customer = await createCustomer();
    const order = await createOrder(customer.customerId);

    const { error } = await collector.client
      .from("orders")
      .update({ status: "shipped" })
      .eq("id", order.id);
    expect(error?.message).toMatch(/Cambio de estado no permitido/);
  });

  it("rejects a cancellation without a reason", async () => {
    const collector = await createTestUser("collector");
    const customer = await createCustomer();
    const order = await createOrder(customer.customerId);

    const { error } = await collector.client
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);
    expect(error).not.toBeNull();
  });

  it("lets app users make the changes listed for them (the trigger can read the table)", async () => {
    const collector = await createTestUser("collector");
    const customer = await createCustomer();

    // Customer cancels while there are no confirmed payments or packages.
    const own = await createOrder(customer.customerId);
    must(
      await customer.client
        .from("orders")
        .update({ status: "cancelled", cancelled_reason: "Ya no lo quiero" })
        .eq("id", own.id),
    );
    expect((await getOrder(own.id)).status).toBe("cancelled");

    // Collector: receiving -> complete and shipped -> delivered.
    const receiving = await createOrder(customer.customerId, "receiving");
    must(
      await collector.client
        .from("orders")
        .update({ status: "complete" })
        .eq("id", receiving.id),
    );
    expect((await getOrder(receiving.id)).status).toBe("complete");

    const shipped = await createOrder(customer.customerId, "shipped");
    must(
      await collector.client
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", shipped.id),
    );
    expect((await getOrder(shipped.id)).status).toBe("delivered");
  });

  it("a customer cannot cancel once the payment is confirmed", async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer.customerId, "payment_confirmed");
    const { error } = await customer.client
      .from("orders")
      .update({ status: "cancelled", cancelled_reason: "Ya no" })
      .eq("id", order.id);
    expect(error).not.toBeNull();
    expect((await getOrder(order.id)).status).toBe("payment_confirmed");
  });

  it("records every change in the history", async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer.customerId, "payment_confirmed");
    const history = must(
      await customer.client
        .from("order_status_history")
        .select("from_status, to_status")
        .eq("order_id", order.id)
        .order("created_at"),
    );
    expect(history.map((h) => h.to_status)).toEqual([
      "registered",
      "payment_pending",
      "payment_confirmed",
    ]);
  });
});
