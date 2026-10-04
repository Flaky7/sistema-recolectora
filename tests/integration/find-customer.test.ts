import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createBazaar, createCustomer, createOrder } from "../helpers/fixtures";
import {
  adminClient,
  createTestUser,
  must,
  resetTestData,
  uniquePhone,
  type TestUser,
} from "../helpers/supabase";

let collector: TestUser;
let customer: TestUser & { customerId: string };
let code: string;
let phone: string;

beforeAll(async () => {
  phone = uniquePhone();
  [collector, customer] = await Promise.all([
    createTestUser("collector"),
    createCustomer({ fullName: "Zoila Búsqueda Única", whatsapp: phone }),
  ]);
  code = must(
    await adminClient().from("customers").select("code").eq("id", customer.customerId).single(),
  ).code;
});

afterAll(resetTestData);

describe("find_customer (US2, FR-016)", () => {
  it("finds by exact code, normalized, with active orders only", async () => {
    const open = await createOrder(customer.customerId, "payment_confirmed");
    await createOrder(customer.customerId, "cancelled");

    const typed = `${code.slice(0, 2).toLowerCase()} ${code.slice(2)}`;
    const rows = must(await collector.client.rpc("find_customer", { q: typed }));
    expect(rows[0]?.id).toBe(customer.customerId);
    expect(rows[0]?.exact_code).toBe(true);
    const orders = rows[0]!.active_orders as { id: string }[];
    expect(orders.map((o) => o.id)).toEqual([open.id]);
  });

  it("finds by partial name without accents and by partial phone", async () => {
    const byName = must(await collector.client.rpc("find_customer", { q: "zoila busq" }));
    expect(byName.map((r) => r.id)).toContain(customer.customerId);
    const byPhone = must(await collector.client.rpc("find_customer", { q: phone.slice(-6) }));
    expect(byPhone.map((r) => r.id)).toContain(customer.customerId);
  });

  it("an unknown code returns nothing", async () => {
    expect(must(await collector.client.rpc("find_customer", { q: "ZZZZZ" }))).toEqual([]);
  });

  it("customers and bazaars cannot run it", async () => {
    const asCustomer = await customer.client.rpc("find_customer", { q: code });
    expect(asCustomer.error).not.toBeNull();
    const bazaar = await createBazaar("draft");
    const asBazaar = await bazaar.client.rpc("find_customer", { q: code });
    expect(asBazaar.error).not.toBeNull();
  });
});
