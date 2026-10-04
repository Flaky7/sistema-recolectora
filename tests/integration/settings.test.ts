import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createBazaar, createCustomer } from "../helpers/fixtures";
import { anonClient, createTestUser, must, resetTestData, type TestUser } from "../helpers/supabase";

let collector: TestUser;
let customer: TestUser;
let original: number;

beforeAll(async () => {
  [collector, customer] = await Promise.all([createTestUser("collector"), createCustomer()]);
  original = must(await collector.client.from("settings").select("initial_deposit_cents").single())
    .initial_deposit_cents;
});

afterAll(async () => {
  await collector.client.from("settings").update({ initial_deposit_cents: original }).eq("id", 1);
  await resetTestData();
});

describe("settings (FR-040, research R19)", () => {
  it("only the collector reads and updates the settings", async () => {
    must(await collector.client.from("settings").update({ initial_deposit_cents: 12300 }).eq("id", 1));
    expect(must(await collector.client.from("settings").select("initial_deposit_cents").single()).initial_deposit_cents).toBe(12300);

    await customer.client.from("settings").update({ initial_deposit_cents: 1 }).eq("id", 1);
    expect(must(await collector.client.from("settings").select("initial_deposit_cents").single()).initial_deposit_cents).toBe(12300);
  });

  it("a customer gets amount and instructions only through get_payment_info()", async () => {
    expect(must(await customer.client.from("settings").select())).toEqual([]);
    const info = must(await customer.client.rpc("get_payment_info"));
    expect(Object.keys(info[0]!).sort()).toEqual(["initial_deposit_cents", "payment_instructions"]);
  });

  it("bazaars and anonymous visitors get nothing", async () => {
    const bazaar = await createBazaar("draft");
    expect(must(await bazaar.client.from("settings").select())).toEqual([]);
    expect((await bazaar.client.rpc("get_payment_info")).error).not.toBeNull();
    expect((await anonClient().rpc("get_payment_info")).error).not.toBeNull();
  });

  it("rejects a deposit of zero or less", async () => {
    const { error } = await collector.client.from("settings").update({ initial_deposit_cents: 0 }).eq("id", 1);
    expect(error).not.toBeNull();
  });
});
