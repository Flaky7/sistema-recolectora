import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  deleteBazaarWith,
  deleteCustomerWith,
  deleteOwnAccountWith,
} from "@/features/account-deletion/service";
import { registerPackageWith } from "@/features/packages/service";

import { createBazaar, createCustomer, createOrder, getOrder } from "../helpers/fixtures";
import {
  adminClient,
  anonClient,
  createTestUser,
  ensureServerEnv,
  must,
  resetTestData,
  TEST_PASSWORD,
  type TestUser,
} from "../helpers/supabase";

let collector: TestUser;
const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

beforeAll(async () => {
  ensureServerEnv();
  collector = await createTestUser("collector");
});

async function exists(bucket: string, path: string) {
  const [folder, name] = path.split("/") as [string, string];
  const { data } = await adminClient().storage.from(bucket).list(folder, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

async function authUserExists(id: string) {
  const { data } = await adminClient().auth.admin.getUserById(id);
  return Boolean(data.user);
}

afterAll(resetTestData);

describe("account deletion (FR-046 to FR-049, research R16)", () => {
  it("a customer with orders in progress gets ACTIVE_ORDERS and nothing changes", async () => {
    const customer = await createCustomer();
    await createOrder(customer.customerId, "payment_pending");
    const result = await deleteOwnAccountWith(customer.client, customer.id, "customer");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ACTIVE_ORDERS");
    expect(await authUserExists(customer.id)).toBe(true);
  });

  it("a customer without orders in progress deletes her account and cannot sign in again", async () => {
    const customer = await createCustomer();
    await createOrder(customer.customerId, "delivered");
    const result = await deleteOwnAccountWith(customer.client, customer.id, "customer");
    expect(result.ok).toBe(true);
    expect(await authUserExists(customer.id)).toBe(false);
    const row = must(await adminClient().from("customers").select().eq("id", customer.customerId).single());
    expect(row).toMatchObject({
      full_name: "Clienta eliminada",
      whatsapp: null,
      shipping_address: null,
      profile_id: null,
      status: "deleted",
    });
    const { error } = await anonClient().auth.signInWithPassword({
      email: customer.email,
      password: TEST_PASSWORD,
    });
    expect(error).not.toBeNull();
  });

  it("the collector deletes a customer with open orders: cancelled, anonymous, files gone, code kept", async () => {
    const customer = await createCustomer();
    const before = must(await adminClient().from("customers").select("code").eq("id", customer.customerId).single());
    const order = await createOrder(customer.customerId, "payment_confirmed");

    const proof = `${customer.customerId}/${crypto.randomUUID()}.jpg`;
    must(await customer.client.storage.from("payment-proofs").upload(proof, jpeg()));
    const second = await createOrder(customer.customerId);
    must(await customer.client.from("payments").insert({ order_id: second.id, proof_path: proof }));

    const photo = `${customer.customerId}/${crypto.randomUUID()}.jpg`;
    must(await collector.client.storage.from("package-photos").upload(photo, jpeg()));
    const pkg = await registerPackageWith(collector.client, {
      customerId: customer.customerId,
      orderId: order.id,
      bazaarName: "Bazar",
      photoPath: photo,
    });
    expect(pkg.ok).toBe(true);

    const result = await deleteCustomerWith(collector.client, customer.customerId);
    expect(result.ok).toBe(true);

    expect((await getOrder(order.id)).status).toBe("cancelled");
    expect((await getOrder(order.id)).cancelled_reason).toBe("Datos eliminados");
    expect((await getOrder(second.id)).status).toBe("cancelled");
    expect(await exists("payment-proofs", proof)).toBe(false);
    expect(await exists("package-photos", photo)).toBe(false);
    expect(await authUserExists(customer.id)).toBe(false);

    const row = must(await adminClient().from("customers").select().eq("id", customer.customerId).single());
    expect(row.code).toBe(before.code);
    expect(row.status).toBe("deleted");
    expect(must(await adminClient().from("notifications").select("id").eq("customer_id", customer.customerId))).toEqual([]);
    // Business history stays.
    expect(must(await adminClient().from("packages").select("id").eq("order_id", order.id))).toHaveLength(1);
  });

  it("deleting a bazaar removes its files and takes it out of the directory", async () => {
    const bazaar = await createBazaar("approved", { name: "Bazar Eliminable Único" });
    const photo = `${bazaar.bazaarId}/${crypto.randomUUID()}.jpg`;
    must(await adminClient().storage.from("bazaar-photos").upload(photo, jpeg()));
    must(await adminClient().from("bazaar_photos").insert({ bazaar_id: bazaar.bazaarId, position: 1, storage_path: photo }));
    const doc = `${bazaar.bazaarId}/selfie-${crypto.randomUUID()}.jpg`;
    must(await bazaar.client.storage.from("bazaar-documents").upload(doc, jpeg()));
    must(await bazaar.client.from("bazaar_documents").insert({ bazaar_id: bazaar.bazaarId, type: "selfie", storage_path: doc }));

    const result = await deleteBazaarWith(collector.client, bazaar.bazaarId);
    expect(result.ok).toBe(true);
    expect(await exists("bazaar-photos", photo)).toBe(false);
    expect(await exists("bazaar-documents", doc)).toBe(false);
    expect(await authUserExists(bazaar.id)).toBe(false);

    const row = must(await adminClient().from("bazaars").select().eq("id", bazaar.bazaarId).single());
    expect(row).toMatchObject({ status: "deleted", brands: null, link_url: null, name: "Bazar Eliminable Único" });
    for (const table of ["bazaar_documents", "bazaar_references", "bazaar_profile_proposals", "bazaar_photos"] as const) {
      expect(must(await adminClient().from(table).select("id").eq("bazaar_id", bazaar.bazaarId))).toEqual([]);
    }
    const listed = must(await anonClient().rpc("search_directory", { q: "eliminable" }));
    expect(listed.map((b) => b.id)).not.toContain(bazaar.bazaarId);
  });

  it("a bazaar deletes its own account", async () => {
    const bazaar = await createBazaar("approved");
    expect((await deleteOwnAccountWith(bazaar.client, bazaar.id, "bazaar")).ok).toBe(true);
    expect(await authUserExists(bazaar.id)).toBe(false);
  });

  it("nobody can anonymize someone else's data", async () => {
    const victim = await createCustomer();
    const attacker = await createCustomer();
    const asCustomer = await attacker.client.rpc("anonymize_customer", { customer_id: victim.customerId });
    expect(asCustomer.error).not.toBeNull();

    const bazaar = await createBazaar("approved");
    const otherBazaar = await createBazaar("approved");
    const asBazaar = await otherBazaar.client.rpc("anonymize_bazaar", { bazaar_id: bazaar.bazaarId });
    expect(asBazaar.error).not.toBeNull();
    expect((await anonClient().rpc("anonymize_customer", { customer_id: victim.customerId })).error).not.toBeNull();

    const row = must(await adminClient().from("customers").select("status").eq("id", victim.customerId).single());
    expect(row.status).toBe("active");
  });

  it("a deactivated customer cannot create orders or upload proofs (FR-049)", async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer.customerId);
    must(await collector.client.from("customers").update({ status: "deactivated" }).eq("id", customer.customerId));

    const created = await customer.client.rpc("create_order", {
      customer_id: customer.customerId,
      description: "Otro",
      expected_packages: 1,
      bazaars: [{ bazaar_name: "Bazar" }],
    });
    expect(created.error).not.toBeNull();
    const upload = await customer.client.storage
      .from("payment-proofs")
      .upload(`${customer.customerId}/${crypto.randomUUID()}.jpg`, jpeg());
    expect(upload.error).not.toBeNull();
    const payment = await customer.client
      .from("payments")
      .insert({ order_id: order.id, proof_path: `${customer.customerId}/x.jpg` });
    expect(payment.error).not.toBeNull();
  });
});
