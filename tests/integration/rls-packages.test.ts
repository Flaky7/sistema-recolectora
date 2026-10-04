import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { assignPackageWith, registerPackageWith } from "@/features/packages/service";

import {
  createCustomer,
  createCustomerWithoutAccount,
  createOrder,
  createPackage,
  getOrder,
} from "../helpers/fixtures";
import {
  adminClient,
  createTestUser,
  must,
  resetTestData,
  uniquePhone,
  type TestUser,
} from "../helpers/supabase";

type Customer = TestUser & { customerId: string };

let alice: Customer;
let bob: Customer;
let collector: TestUser;

beforeAll(async () => {
  [alice, bob, collector] = await Promise.all([
    createCustomer({ fullName: "Alicia Paquetes" }),
    createCustomer(),
    createTestUser("collector"),
  ]);
});

afterAll(resetTestData);

async function uploadPhoto(folder: string) {
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  must(
    await collector.client.storage
      .from("package-photos")
      .upload(path, new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" })),
  );
  return path;
}

async function notificationsFor(packageId: string) {
  return must(await adminClient().from("notifications").select().eq("package_id", packageId));
}

describe("packages RLS and status sync (FR-016 to FR-019)", () => {
  it("only the collector creates packages", async () => {
    const { error } = await alice.client.from("packages").insert({
      customer_id: alice.customerId,
      photo_path: `${alice.customerId}/x.jpg`,
      bazaar_name: "Bazar",
    });
    expect(error).not.toBeNull();
  });

  it("a customer reads only her packages and signs only her photos", async () => {
    const order = await createOrder(alice.customerId, "payment_confirmed");
    const photo = await uploadPhoto(alice.customerId);
    const result = await registerPackageWith(collector.client, {
      customerId: alice.customerId,
      orderId: order.id,
      bazaarName: "Bazar de Ana",
      photoPath: photo,
    });
    expect(result.ok).toBe(true);

    const mine = must(await alice.client.from("packages").select("id, photo_path"));
    expect(mine.map((p) => p.photo_path)).toContain(photo);
    expect(must(await bob.client.from("packages").select("id"))).toEqual([]);

    const own = await alice.client.storage.from("package-photos").createSignedUrl(photo, 60);
    expect(own.error).toBeNull();
    const other = await bob.client.storage.from("package-photos").createSignedUrl(photo, 60);
    expect(other.error).not.toBeNull();
  });

  it("the first package moves a confirmed order to receiving and builds the message", async () => {
    const order = await createOrder(alice.customerId, "payment_confirmed", {
      expectedPackages: 3,
    });
    const result = await registerPackageWith(collector.client, {
      customerId: alice.customerId,
      orderId: order.id,
      bazaarName: "Bazar de Ana",
      photoPath: await uploadPhoto(alice.customerId),
    });
    if (!result.ok) throw new Error(result.error);
    expect((await getOrder(order.id)).status).toBe("receiving");
    expect(result.data.received).toBe(1);
    expect(result.data.expected).toBe(3);

    const delivery = result.data.notification;
    expect(delivery?.kind).toBe("open_url");
    const text = new URL((delivery as { url: string }).url).searchParams.get("text")!;
    expect(text).toContain("Bazar de Ana");
    expect(text).toContain("1 de 3");
    expect(text).toContain(`/mi-cuenta/pedidos/${order.folio}`);

    const saved = await notificationsFor(result.data.package.id);
    expect(saved.map((n) => n.kind)).toEqual(["package_received"]);
  });

  it("a package before the payment is confirmed keeps the order status", async () => {
    const order = await createOrder(alice.customerId, "payment_pending");
    await createPackage(alice.customerId, order.id);
    expect((await getOrder(order.id)).status).toBe("payment_pending");
  });

  it("rejects a package in another customer's order", async () => {
    const order = await createOrder(bob.customerId, "payment_confirmed");
    const result = await registerPackageWith(collector.client, {
      customerId: alice.customerId,
      orderId: order.id,
      bazaarName: "Bazar",
      photoPath: await uploadPhoto(alice.customerId),
    });
    expect(result.ok).toBe(false);
  });

  it("cannot move a package into or out of a shipped order", async () => {
    const shipped = await createOrder(alice.customerId, "shipped");
    const open = await createOrder(alice.customerId, "payment_confirmed");
    const pkg = await createPackage(alice.customerId, open.id);

    const into = await collector.client
      .from("packages")
      .update({ order_id: shipped.id })
      .eq("id", pkg.id);
    expect(into.error).not.toBeNull();

    const shippedPackage = must(
      await adminClient().from("packages").select("id").eq("order_id", shipped.id).limit(1).single(),
    );
    const outOf = await collector.client
      .from("packages")
      .update({ order_id: open.id })
      .eq("id", shippedPackage.id);
    expect(outOf.error).not.toBeNull();
  });

  it("a package without order sends package_unassigned with a link to /mi-cuenta", async () => {
    const result = await registerPackageWith(collector.client, {
      customerId: alice.customerId,
      bazaarName: "Bazar Sorpresa",
      photoPath: await uploadPhoto(alice.customerId),
    });
    if (!result.ok) throw new Error(result.error);
    const text = new URL((result.data.notification as { url: string }).url).searchParams.get(
      "text",
    )!;
    expect(text).toContain("Bazar Sorpresa");
    expect(text).toMatch(/\/mi-cuenta$/m);
    expect((await notificationsFor(result.data.package.id)).map((n) => n.kind)).toEqual([
      "package_unassigned",
    ]);

    // Assigning it to an order afterwards generates the normal message (FR-018).
    const order = await createOrder(alice.customerId, "payment_confirmed");
    const assigned = await assignPackageWith(collector.client, {
      packageId: result.data.package.id,
      customerId: alice.customerId,
      orderId: order.id,
    });
    if (!assigned.ok) throw new Error(assigned.error);
    expect(assigned.data.notification).not.toBeNull();
    expect((await notificationsFor(result.data.package.id)).map((n) => n.kind).sort()).toEqual([
      "package_received",
      "package_unassigned",
    ]);
  });

  it("customers without an account get no link line (FR-045)", async () => {
    const noAccount = await createCustomerWithoutAccount(uniquePhone());
    const result = await registerPackageWith(collector.client, {
      customerId: noAccount.id,
      bazaarName: "Bazar Sorpresa",
      photoPath: await uploadPhoto(noAccount.id),
    });
    if (!result.ok) throw new Error(result.error);
    const text = new URL((result.data.notification as { url: string }).url).searchParams.get(
      "text",
    )!;
    expect(text).not.toContain("http");
  });

  it("an unidentified package generates no message", async () => {
    const result = await registerPackageWith(collector.client, {
      bazaarName: "Bazar Desconocido",
      photoPath: await uploadPhoto("unidentified"),
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.data.notification).toBeNull();
    expect(await notificationsFor(result.data.package.id)).toEqual([]);
  });

  it("rejects a photo outside the customer's folder", async () => {
    const result = await registerPackageWith(collector.client, {
      customerId: alice.customerId,
      bazaarName: "Bazar",
      photoPath: `${bob.customerId}/foto.jpg`,
    });
    expect(result.ok).toBe(false);
  });

  it("customers and bazaars cannot read notifications", async () => {
    expect(must(await alice.client.from("notifications").select("id"))).toEqual([]);
  });
});
