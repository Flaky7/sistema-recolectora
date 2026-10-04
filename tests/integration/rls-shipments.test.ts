import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCustomer, createOrder, getOrder } from "../helpers/fixtures";
import {
  createTestUser,
  must,
  resetTestData,
  type TestUser,
} from "../helpers/supabase";

type Customer = TestUser & { customerId: string };

let local: Customer;
let outOfTown: Customer;
let collector: TestUser;

beforeAll(async () => {
  [local, outOfTown, collector] = await Promise.all([
    createCustomer({ type: "local" }),
    createCustomer({ type: "out_of_town" }),
    createTestUser("collector"),
  ]);
});

afterAll(resetTestData);

describe("shipments RLS and rules (FR-020 to FR-023)", () => {
  it("only the collector creates shipments", async () => {
    const order = await createOrder(local.customerId, "complete");
    const { error } = await local.client
      .from("shipments")
      .insert({ order_id: order.id, type: "local_pickup" });
    expect(error).not.toBeNull();
    expect((await getOrder(order.id)).status).toBe("complete");
  });

  it("inserting a shipment moves the order to shipped; a second one fails", async () => {
    const order = await createOrder(outOfTown.customerId, "complete");
    must(
      await collector.client.from("shipments").insert({
        order_id: order.id,
        type: "carrier",
        carrier: "Estafeta",
        tracking_number: "EST123456",
        cost_cents: 18900,
      }),
    );
    expect((await getOrder(order.id)).status).toBe("shipped");

    const again = await collector.client.from("shipments").insert({
      order_id: order.id,
      type: "carrier",
      carrier: "DHL",
      tracking_number: "D1234",
    });
    expect(again.error).not.toBeNull();
  });

  it("in-person types are only for local customers", async () => {
    const order = await createOrder(outOfTown.customerId, "complete");
    const { error } = await collector.client
      .from("shipments")
      .insert({ order_id: order.id, type: "local_delivery" });
    expect(error?.message).toMatch(/solo es para clientas locales/);

    const localOrder = await createOrder(local.customerId, "complete");
    must(
      await collector.client
        .from("shipments")
        .insert({ order_id: localOrder.id, type: "local_delivery" }),
    );
    expect((await getOrder(localOrder.id)).status).toBe("shipped");
  });

  it("a carrier shipment needs carrier and tracking number", async () => {
    const order = await createOrder(outOfTown.customerId, "complete");
    const { error } = await collector.client
      .from("shipments")
      .insert({ order_id: order.id, type: "carrier" });
    expect(error).not.toBeNull();
  });

  it("an order must be complete before shipping", async () => {
    const order = await createOrder(local.customerId, "receiving");
    const { error } = await collector.client
      .from("shipments")
      .insert({ order_id: order.id, type: "local_pickup" });
    expect(error).not.toBeNull();
  });

  it("the customer reads only her own shipment", async () => {
    const order = await createOrder(local.customerId, "shipped");
    const mine = must(await local.client.from("shipments").select("order_id"));
    expect(mine.map((s) => s.order_id)).toContain(order.id);
    const theirs = must(
      await outOfTown.client
        .from("shipments")
        .select("order_id")
        .eq("order_id", order.id),
    );
    expect(theirs).toEqual([]);
  });

  it("marking delivered stamps delivered_at", async () => {
    const order = await createOrder(local.customerId, "shipped");
    must(
      await collector.client
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", order.id),
    );
    const shipment = must(
      await collector.client
        .from("shipments")
        .select("delivered_at")
        .eq("order_id", order.id)
        .single(),
    );
    expect(shipment.delivered_at).not.toBeNull();
  });

  it("a customer cannot mark her order delivered or complete", async () => {
    const order = await createOrder(local.customerId, "receiving");
    await local.client
      .from("orders")
      .update({ status: "complete" })
      .eq("id", order.id);
    expect((await getOrder(order.id)).status).toBe("receiving");
  });
});
