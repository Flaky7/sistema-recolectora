import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCustomer,
  createOrder,
  createPayment,
} from "../helpers/fixtures";
import {
  adminClient,
  anonClient,
  createTestUser,
  must,
  resetTestData,
  type TestUser,
} from "../helpers/supabase";

type Customer = TestUser & { customerId: string };

let alice: Customer;
let bob: Customer;
let collector: TestUser;
let aliceOrderId: string;
let bobOrderId: string;

beforeAll(async () => {
  [alice, bob, collector] = await Promise.all([
    createCustomer(),
    createCustomer(),
    createTestUser("collector"),
  ]);
  aliceOrderId = (await createOrder(alice.customerId, "payment_pending")).id;
  bobOrderId = (await createOrder(bob.customerId, "payment_pending")).id;
});

afterAll(resetTestData);

describe("customers and orders RLS (FR-004, US1 scenario 6)", () => {
  it("a customer reads only her own customer row", async () => {
    const rows = must(await alice.client.from("customers").select("id"));
    expect(rows.map((r) => r.id)).toEqual([alice.customerId]);
  });

  it("a customer reads only her own orders, history and payments", async () => {
    const orders = must(await alice.client.from("orders").select("id"));
    expect(orders.map((o) => o.id)).toEqual([aliceOrderId]);

    const history = must(
      await alice.client.from("order_status_history").select("order_id"),
    );
    expect(new Set(history.map((h) => h.order_id))).toEqual(
      new Set([aliceOrderId]),
    );

    const payments = must(
      await alice.client.from("payments").select("order_id"),
    );
    expect(payments.map((p) => p.order_id)).toEqual([aliceOrderId]);

    const foreign = must(
      await alice.client.from("orders").select("id").eq("id", bobOrderId),
    );
    expect(foreign).toEqual([]);
  });

  it("anonymous visitors read nothing", async () => {
    const anon = anonClient();
    expect(must(await anon.from("customers").select("id"))).toEqual([]);
    expect(must(await anon.from("orders").select("id"))).toEqual([]);
    expect(must(await anon.from("payments").select("id"))).toEqual([]);
  });

  it("a customer cannot change her code, status or name", async () => {
    const before = must(
      await adminClient()
        .from("customers")
        .select()
        .eq("id", alice.customerId)
        .single(),
    );
    const attempts = [
      { code: "ZZZZZ" },
      { status: "deleted" as const },
      { full_name: "Otra" },
    ];
    for (const change of attempts) {
      const { error } = await alice.client
        .from("customers")
        .update(change)
        .eq("id", alice.customerId);
      expect(error).not.toBeNull();
    }
    const after = must(
      await adminClient()
        .from("customers")
        .select()
        .eq("id", alice.customerId)
        .single(),
    );
    expect(after.code).toBe(before.code);
    expect(after.status).toBe("active");
    expect(after.full_name).toBe(before.full_name);
  });

  it("a customer can update her WhatsApp, address and type", async () => {
    must(
      await alice.client
        .from("customers")
        .update({
          shipping_address: "Nueva dirección 456, Tijuana",
          type: "out_of_town",
        })
        .eq("id", alice.customerId),
    );
    const row = must(
      await adminClient()
        .from("customers")
        .select()
        .eq("id", alice.customerId)
        .single(),
    );
    expect(row.type).toBe("out_of_town");
  });

  it("a customer cannot create a confirmed payment or choose the amount", async () => {
    const order = await createOrder(alice.customerId);
    await alice.client.from("payments").insert({
      order_id: order.id,
      status: "confirmed",
      amount_cents: 1,
      proof_path: `${alice.customerId}/x.jpg`,
    });
    const payments = must(
      await adminClient().from("payments").select().eq("order_id", order.id),
    );
    for (const payment of payments) {
      expect(payment.status).toBe("pending");
      expect(payment.amount_cents).not.toBe(1);
    }
  });

  it("a customer cannot pay for another customer's order", async () => {
    const order = await createOrder(bob.customerId);
    const { error } = await alice.client
      .from("payments")
      .insert({ order_id: order.id, proof_path: `${alice.customerId}/x.jpg` });
    expect(error).not.toBeNull();
  });

  it("a customer cannot create orders for someone else", async () => {
    const { error } = await alice.client.rpc("create_order", {
      customer_id: bob.customerId,
      description: "No es mío",
      expected_packages: 1,
      bazaars: [{ bazaar_name: "Bazar" }],
    });
    expect(error).not.toBeNull();
  });

  it("nobody but the collector reads payment proofs, not even the owner", async () => {
    const path = `${alice.customerId}/${crypto.randomUUID()}.pdf`;
    must(
      await alice.client.storage
        .from("payment-proofs")
        .upload(path, new Blob(["%PDF-1.4"], { type: "application/pdf" })),
    );

    const own = await alice.client.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60);
    expect(own.error).not.toBeNull();
    const other = await bob.client.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60);
    expect(other.error).not.toBeNull();
    const asCollector = await collector.client.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60);
    expect(asCollector.error).toBeNull();
  });

  it("a customer cannot upload into another customer's folder", async () => {
    const { error } = await alice.client.storage.from("payment-proofs").upload(
      `${bob.customerId}/${crypto.randomUUID()}.pdf`,
      new Blob(["x"], {
        type: "application/pdf",
      }),
    );
    expect(error).not.toBeNull();
  });

  it("a deactivated customer still reads her orders but cannot create or pay (FR-049)", async () => {
    const carol = await createCustomer();
    const order = await createOrder(carol.customerId);
    must(
      await collector.client
        .from("customers")
        .update({ status: "deactivated" })
        .eq("id", carol.customerId),
    );

    expect(must(await carol.client.from("orders").select("id")).length).toBe(1);

    const created = await carol.client.rpc("create_order", {
      customer_id: carol.customerId,
      description: "Otro",
      expected_packages: 1,
      bazaars: [{ bazaar_name: "Bazar" }],
    });
    expect(created.error).not.toBeNull();

    const paid = await carol.client
      .from("payments")
      .insert({ order_id: order.id, proof_path: `${carol.customerId}/x.jpg` });
    expect(paid.error).not.toBeNull();
  });

  it("the collector reads every customer, order and payment", async () => {
    const customers = must(
      await collector.client
        .from("customers")
        .select("id")
        .in("id", [alice.customerId, bob.customerId]),
    );
    expect(customers).toHaveLength(2);
    const orders = must(
      await collector.client
        .from("orders")
        .select("id")
        .in("id", [aliceOrderId, bobOrderId]),
    );
    expect(orders).toHaveLength(2);
  });

  it("the collector can register a customer without an account but never change a code", async () => {
    const created = must(
      await collector.client
        .from("customers")
        .insert({
          full_name: "Sin Cuenta",
          whatsapp: `7${Date.now().toString().slice(-9)}`,
          shipping_address: "Calle Sin Cuenta 1, Tijuana",
          type: "local",
        })
        .select()
        .single(),
    );
    expect(created.profile_id).toBeNull();
    expect(created.code).toMatch(/^[2-9A-HJ-NP-Z]{5}$/);

    const { error } = await collector.client
      .from("customers")
      .update({ code: "ZZZZZ" })
      .eq("id", created.id);
    expect(error).not.toBeNull();
  });

  it("a customer cannot insert customers", async () => {
    const { error } = await alice.client.from("customers").insert({
      full_name: "Falsa",
      whatsapp: "7000000001",
      shipping_address: "Calle Falsa 123, Tijuana",
      type: "local",
    });
    expect(error).not.toBeNull();
  });

  it("payments created via fixtures belong to the right order", async () => {
    const order = await createOrder(bob.customerId);
    const payment = await createPayment(order.id, bob.customerId, "pending");
    expect(payment.order_id).toBe(order.id);
  });
});
