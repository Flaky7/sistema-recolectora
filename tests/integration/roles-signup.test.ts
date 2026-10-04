import { afterAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  must,
  resetTestData,
  TEST_PASSWORD,
  uniqueEmail,
  uniquePhone,
} from "../helpers/supabase";

afterAll(resetTestData);

async function signUp(metadata: Record<string, unknown>) {
  return anonClient().auth.signUp({
    email: uniqueEmail("signup"),
    password: TEST_PASSWORD,
    options: { data: metadata },
  });
}

describe("sign-up and roles (FR-003)", () => {
  it("rejects signing up as collector", async () => {
    const { error } = await signUp({ role: "collector", privacy_accepted: true });
    expect(error).not.toBeNull();
  });

  it("rejects an unknown or missing role", async () => {
    expect((await signUp({ role: "admin", privacy_accepted: true })).error).not.toBeNull();
    expect((await signUp({ privacy_accepted: true })).error).not.toBeNull();
  });

  it("rejects a customer who did not accept the privacy notice (FR-005)", async () => {
    const { error } = await signUp({
      role: "customer",
      full_name: "Sin Aviso",
      whatsapp: uniquePhone(),
      shipping_address: "Calle de Prueba 123, Tijuana",
      type: "local",
    });
    expect(error).not.toBeNull();
  });

  it("creates profile and customer with a 5-character code", async () => {
    const user = await createTestUser("customer");
    const admin = adminClient();
    const profile = must(await admin.from("profiles").select().eq("id", user.id).single());
    expect(profile.role).toBe("customer");
    expect(profile.privacy_accepted_at).not.toBeNull();

    const customer = must(
      await admin.from("customers").select().eq("profile_id", user.id).single(),
    );
    expect(customer.code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    expect(customer.status).toBe("active");
  });

  it("creates a bazaar in draft without published data", async () => {
    const user = await createTestUser("bazaar");
    const bazaar = must(
      await adminClient().from("bazaars").select().eq("profile_id", user.id).single(),
    );
    expect(bazaar.status).toBe("draft");
    expect(bazaar.name).toBeNull();
    expect(bazaar.brands).toBeNull();
    expect(bazaar.link_url).toBeNull();
  });

  it("does not let any user change their role", async () => {
    for (const role of ["customer", "bazaar", "collector"] as const) {
      const user = await createTestUser(role);
      await user.client.from("profiles").update({ role: "collector" }).eq("id", user.id);
      const profile = must(
        await adminClient().from("profiles").select("role").eq("id", user.id).single(),
      );
      expect(profile.role).toBe(role);
    }
  });

  it("does not expose promote_to_collector through the API", async () => {
    const user = await createTestUser("customer");
    const { error } = await user.client.rpc("promote_to_collector", { email: user.email });
    expect(error).not.toBeNull();
    const anon = await anonClient().rpc("promote_to_collector", { email: user.email });
    expect(anon.error).not.toBeNull();
  });
});
