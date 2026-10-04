import { afterAll, describe, expect, it } from "vitest";

import {
  createCustomer,
  createCustomerWithoutAccount,
  createOrder,
} from "../helpers/fixtures";
import {
  adminClient,
  anonClient,
  must,
  resetTestData,
  signInAs,
  TEST_PASSWORD,
  uniqueEmail,
  uniquePhone,
} from "../helpers/supabase";

afterAll(resetTestData);

function customerMeta(whatsapp: string, code?: string) {
  return {
    role: "customer",
    privacy_accepted: true,
    full_name: "Persona Que Reclama",
    whatsapp,
    shipping_address: "Otra dirección 789, Tijuana",
    type: "local",
    customer_code: code,
  };
}

async function signUpConfirmed(whatsapp: string, code?: string) {
  const email = uniqueEmail("claim");
  const result = await adminClient().auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: customerMeta(whatsapp, code),
  });
  return { email, ...result };
}

describe("check_customer_claim (FR-044)", () => {
  it("answers only free / code_required / ok / has_account", async () => {
    const anon = anonClient();
    const free = must(
      await anon.rpc("check_customer_claim", { whatsapp: uniquePhone() }),
    );
    expect(free).toBe("free");

    const phone = uniquePhone();
    const withoutAccount = await createCustomerWithoutAccount(phone);
    expect(
      must(await anon.rpc("check_customer_claim", { whatsapp: phone })),
    ).toBe("code_required");
    expect(
      must(
        await anon.rpc("check_customer_claim", {
          whatsapp: phone,
          code: withoutAccount.code,
        }),
      ),
    ).toBe("ok");

    const withAccount = await createCustomer();
    const row = must(
      await adminClient()
        .from("customers")
        .select("whatsapp")
        .eq("id", withAccount.customerId)
        .single(),
    );
    expect(
      must(await anon.rpc("check_customer_claim", { whatsapp: row.whatsapp! })),
    ).toBe("has_account");
  });
});

describe("claiming a customer registered by the collector", () => {
  it("links the account with the right code and keeps code and orders", async () => {
    const phone = uniquePhone();
    const existing = await createCustomerWithoutAccount(phone);
    const order = await createOrder(existing.id);

    const { email, error } = await signUpConfirmed(
      phone,
      existing.code.toLowerCase(),
    );
    expect(error).toBeNull();

    const client = await signInAs(email);
    const mine = must(await client.from("customers").select().single());
    expect(mine.id).toBe(existing.id);
    expect(mine.code).toBe(existing.code);
    expect(mine.full_name).toBe(existing.full_name);
    expect(
      must(await client.from("orders").select("id")).map((o) => o.id),
    ).toEqual([order.id]);
  });

  it("rejects a wrong or missing code without creating anything", async () => {
    const phone = uniquePhone();
    await createCustomerWithoutAccount(phone);

    const wrong = await signUpConfirmed(phone, "ZZZZZ");
    expect(wrong.error).not.toBeNull();
    const missing = await signUpConfirmed(phone);
    expect(missing.error).not.toBeNull();

    const profiles = must(
      await adminClient()
        .from("profiles")
        .select("id")
        .in("email", [wrong.email, missing.email]),
    );
    expect(profiles).toEqual([]);
  });

  it("rejects the WhatsApp of a customer who already has an account (ACCOUNT_EXISTS)", async () => {
    const owner = await createCustomer();
    const row = must(
      await adminClient()
        .from("customers")
        .select("whatsapp")
        .eq("id", owner.customerId)
        .single(),
    );
    const attempt = await signUpConfirmed(row.whatsapp!);
    expect(attempt.error).not.toBeNull();
    const profiles = must(
      await adminClient()
        .from("profiles")
        .select("id")
        .eq("email", attempt.email),
    );
    expect(profiles).toEqual([]);
  });
});
