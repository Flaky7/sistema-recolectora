import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCustomer,
  createOrder,
  createPackage,
  getOrder,
} from "../helpers/fixtures";
import {
  createTestUser,
  must,
  resetTestData,
  type TestUser,
} from "../helpers/supabase";

type Customer = TestUser & { customerId: string };

let customer: Customer;
let collector: TestUser;

beforeAll(async () => {
  [customer, collector] = await Promise.all([
    createCustomer(),
    createTestUser("collector"),
  ]);
});

afterAll(resetTestData);

async function uploadProof(order: { id: string }) {
  return must(
    await customer.client
      .from("payments")
      .insert({
        order_id: order.id,
        proof_path: `${customer.customerId}/${crypto.randomUUID()}.jpg`,
      })
      .select()
      .single(),
  );
}

describe("payment flow (FR-012, FR-043, FR-051)", () => {
  it("pending proof -> payment_pending -> confirm -> payment_confirmed", async () => {
    const order = await createOrder(customer.customerId);
    const payment = await uploadProof(order);
    expect(payment.status).toBe("pending");
    expect(payment.amount_cents).toBeGreaterThan(0);
    expect((await getOrder(order.id)).status).toBe("payment_pending");

    must(
      await collector.client
        .from("payments")
        .update({ status: "confirmed" })
        .eq("id", payment.id),
    );
    expect((await getOrder(order.id)).status).toBe("payment_confirmed");
  });

  it("reject needs a reason and returns the order to registered", async () => {
    const order = await createOrder(customer.customerId);
    const payment = await uploadProof(order);

    const noReason = await collector.client
      .from("payments")
      .update({ status: "rejected" })
      .eq("id", payment.id);
    expect(noReason.error).not.toBeNull();

    must(
      await collector.client
        .from("payments")
        .update({
          status: "rejected",
          rejection_reason: "El monto no coincide",
        })
        .eq("id", payment.id),
    );
    expect((await getOrder(order.id)).status).toBe("registered");

    const history = must(
      await customer.client
        .from("order_status_history")
        .select("to_status, note")
        .eq("order_id", order.id)
        .order("created_at"),
    );
    expect(history.at(-1)?.note).toMatch(/El monto no coincide/);

    // The customer can upload a new proof after a rejection; the old one stays as history.
    await uploadProof(order);
    expect((await getOrder(order.id)).status).toBe("payment_pending");
    const payments = must(
      await customer.client.from("payments").select().eq("order_id", order.id),
    );
    expect(payments.map((p) => p.status).sort()).toEqual([
      "pending",
      "rejected",
    ]);
  });

  it("a second pending payment for the same order fails", async () => {
    const order = await createOrder(customer.customerId);
    await uploadProof(order);
    const { error } = await customer.client.from("payments").insert({
      order_id: order.id,
      proof_path: `${customer.customerId}/again.jpg`,
    });
    expect(error).not.toBeNull();
  });

  it("a customer cannot confirm her own payment", async () => {
    const order = await createOrder(customer.customerId);
    const payment = await uploadProof(order);
    await customer.client
      .from("payments")
      .update({ status: "confirmed" })
      .eq("id", payment.id);
    expect((await getOrder(order.id)).status).toBe("payment_pending");
  });

  it("a payment recorded as confirmed by the collector -> payment_confirmed (FR-043)", async () => {
    const order = await createOrder(customer.customerId);
    const payment = must(
      await collector.client
        .from("payments")
        .insert({
          order_id: order.id,
          status: "confirmed",
          amount_cents: 15000,
        })
        .select()
        .single(),
    );
    expect(payment.amount_cents).toBe(15000);
    expect(payment.reviewed_by).toBe(collector.id);
    expect((await getOrder(order.id)).status).toBe("payment_confirmed");
  });

  it("confirming the payment of an order that already has packages -> receiving", async () => {
    const order = await createOrder(customer.customerId, "payment_pending");
    await createPackage(customer.customerId, order.id);
    expect((await getOrder(order.id)).status).toBe("payment_pending");

    const payment = must(
      await collector.client
        .from("payments")
        .select()
        .eq("order_id", order.id)
        .eq("status", "pending")
        .single(),
    );
    must(
      await collector.client
        .from("payments")
        .update({ status: "confirmed" })
        .eq("id", payment.id),
    );
    expect((await getOrder(order.id)).status).toBe("receiving");
  });

  it("a deactivated customer cannot upload proofs but still sees her orders (FR-049)", async () => {
    const other = await createCustomer();
    const order = await createOrder(other.customerId);
    must(
      await collector.client
        .from("customers")
        .update({ status: "deactivated" })
        .eq("id", other.customerId),
    );
    const { error } = await other.client
      .from("payments")
      .insert({ order_id: order.id, proof_path: `${other.customerId}/x.jpg` });
    expect(error).not.toBeNull();
    expect(must(await other.client.from("orders").select("id"))).toHaveLength(
      1,
    );
  });
});
