/**
 * Builds customers, orders, payments, packages and bazaars in a given state for integration
 * tests. Uses the service-role client to arrange data; tests then act as each role.
 */
import type { Database } from "@/lib/supabase/database.types";

import { adminClient, createTestUser, must, type TestUser } from "./supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type BazaarStatus = Database["public"]["Enums"]["bazaar_status"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

export async function createCustomer(
  data: Parameters<typeof createTestUser>[1] = {},
): Promise<TestUser & { customerId: string }> {
  const user = await createTestUser("customer", data);
  return { ...user, customerId: user.entityId! };
}

/** A customer registered by the collector, without an account (FR-041). */
export async function createCustomerWithoutAccount(
  whatsapp: string,
  type: "local" | "out_of_town" = "local",
) {
  return must(
    await adminClient()
      .from("customers")
      .insert({
        full_name: "Clienta Sin Cuenta",
        whatsapp,
        shipping_address: "Calle Sin Cuenta 456, Tijuana, B.C.",
        type,
      })
      .select()
      .single(),
  );
}

/**
 * Creates an order and walks it to `status` the same way the app does: payments and packages
 * move it through the triggers; complete/shipped/delivered are set like the collector would.
 */
export async function createOrder(
  customerId: string,
  status: OrderStatus = "registered",
  options: { expectedPackages?: number } = {},
): Promise<Order> {
  const admin = adminClient();
  const order = must(
    await admin.rpc("create_order", {
      customer_id: customerId,
      description: "Pedido de prueba",
      expected_packages: options.expectedPackages ?? 1,
      bazaars: [{ bazaar_name: "Bazar de prueba" }],
    }),
  ) as Order;

  if (status === "registered") return order;
  if (status === "cancelled") {
    return must(
      await admin
        .from("orders")
        .update({ status: "cancelled", cancelled_reason: "Prueba" })
        .eq("id", order.id)
        .select()
        .single(),
    );
  }

  if (status === "payment_pending") {
    await createPayment(order.id, customerId, "pending");
    return getOrder(order.id);
  }

  await createPayment(order.id, customerId, "confirmed");
  if (status === "payment_confirmed") return getOrder(order.id);

  await createPackage(customerId, order.id);
  if (status === "receiving") return getOrder(order.id);

  must(await admin.from("orders").update({ status: "complete" }).eq("id", order.id));
  if (status === "complete") return getOrder(order.id);

  must(
    await admin
      .from("shipments")
      .insert({ order_id: order.id, type: "carrier", carrier: "Estafeta", tracking_number: "ABC123" }),
  );
  if (status === "shipped") return getOrder(order.id);

  must(await admin.from("orders").update({ status: "delivered" }).eq("id", order.id));
  return getOrder(order.id);
}

export async function getOrder(orderId: string): Promise<Order> {
  return must(await adminClient().from("orders").select().eq("id", orderId).single());
}

export async function createPayment(
  orderId: string,
  customerId: string,
  status: "pending" | "confirmed",
) {
  const admin = adminClient();
  const payment = must(
    await admin
      .from("payments")
      .insert({ order_id: orderId, proof_path: `${customerId}/proof-test.jpg` })
      .select()
      .single(),
  );
  if (status === "pending") return payment;
  return must(
    await admin
      .from("payments")
      .update({ status: "confirmed" })
      .eq("id", payment.id)
      .select()
      .single(),
  );
}

export async function createPackage(customerId: string | null, orderId: string | null) {
  return must(
    await adminClient()
      .from("packages")
      .insert({
        customer_id: customerId,
        order_id: orderId,
        bazaar_name: "Bazar de prueba",
        photo_path: `${customerId ?? "unidentified"}/${crypto.randomUUID()}.jpg`,
      })
      .select()
      .single(),
  );
}

/** Proposal, 4 documents and 3 references: everything needed to submit for review. */
export async function completeBazaarProfile(bazaarId: string, name = "Bazar de Prueba") {
  const admin = adminClient();
  must(
    await admin.from("bazaar_profile_proposals").insert({
      bazaar_id: bazaarId,
      name,
      brands: ["Zara", "Mango"],
      link_url: "https://www.facebook.com/bazardeprueba",
    }),
  );
  must(
    await admin.from("bazaar_documents").insert(
      (["id_card", "selfie", "proof_of_address", "registration_payment"] as const).map(
        (type) => ({
          bazaar_id: bazaarId,
          type,
          storage_path: `${bazaarId}/${type}-${crypto.randomUUID()}.jpg`,
        }),
      ),
    ),
  );
  must(
    await admin.from("bazaar_references").insert(
      [1, 2, 3].map((position) => ({
        bazaar_id: bazaarId,
        position,
        full_name: `Referencia ${position}`,
        phone: `664000000${position}`,
      })),
    ),
  );
}

/** A bazaar user whose bazaar is in `status` (draft, pending_review, approved, …). */
export async function createBazaar(
  status: BazaarStatus = "draft",
  options: { complete?: boolean; name?: string } = {},
): Promise<TestUser & { bazaarId: string }> {
  const user = await createTestUser("bazaar");
  const bazaarId = user.entityId!;
  const admin = adminClient();

  if (options.complete ?? status !== "draft") {
    await completeBazaarProfile(bazaarId, options.name);
  }
  if (status === "draft") return { ...user, bazaarId };

  must(await admin.from("bazaars").update({ status: "pending_review" }).eq("id", bazaarId));
  if (status === "pending_review") return { ...user, bazaarId };

  if (status === "rejected") {
    must(
      await admin
        .from("bazaars")
        .update({ status: "rejected", status_reason: "Prueba" })
        .eq("id", bazaarId),
    );
    return { ...user, bazaarId };
  }

  const proposal = must(
    await admin
      .from("bazaar_profile_proposals")
      .select()
      .eq("bazaar_id", bazaarId)
      .eq("status", "pending")
      .single(),
  );
  must(
    await admin
      .from("bazaars")
      .update({
        name: proposal.name,
        brands: proposal.brands,
        link_url: proposal.link_url,
        status: "approved",
      })
      .eq("id", bazaarId),
  );
  must(
    await admin
      .from("bazaar_profile_proposals")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", proposal.id),
  );
  if (status === "approved") return { ...user, bazaarId };

  must(
    await admin
      .from("bazaars")
      .update({ status: "suspended", status_reason: "Prueba" })
      .eq("id", bazaarId),
  );
  return { ...user, bazaarId };
}
