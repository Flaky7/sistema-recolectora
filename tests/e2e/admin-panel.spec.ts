import { expect, test } from "@playwright/test";

import { adminClient } from "../helpers/supabase";

import { SEED_USERS, signIn, signOut } from "./helpers/auth";

async function expectedCounts() {
  const admin = adminClient();
  const head = { count: "exact", head: true } as const;
  const [payments, unassigned, toShip, toReview, proposals] = await Promise.all([
    admin.from("payments").select("id", head).eq("status", "pending"),
    admin.from("packages").select("id", head).is("order_id", null),
    admin.from("orders").select("id", head).eq("status", "complete"),
    admin.from("bazaars").select("id", head).eq("status", "pending_review"),
    admin
      .from("bazaar_profile_proposals")
      .select("id, bazaar:bazaars!inner(status)", head)
      .eq("status", "pending")
      .eq("bazaar.status", "approved"),
  ]);
  return {
    "Pagos por confirmar": payments.count,
    "Paquetes sin asignar": unassigned.count,
    "Pedidos completos por enviar": toShip.count,
    "Bazares por revisar": toReview.count,
    "Cambios de ficha por autorizar": proposals.count,
  };
}

// US7: dashboard counters, filters, settings validation and role redirects.
test("contadores del panel coinciden con los pendientes", async ({ page }) => {
  await signIn(page, SEED_USERS.collector, "collector");
  const expected = await expectedCounts();
  for (const [label, value] of Object.entries(expected)) {
    await expect(page.getByTestId(`count-${label}`)).toHaveText(String(value));
  }
});

test("filtros de pedidos por estado, clienta y bazar", async ({ page }) => {
  const admin = adminClient();
  const { data: rosa } = await admin.from("customers").select("code").eq("whatsapp", "6642222222").single();

  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/pedidos");
  await page.getByLabel("Estado").selectOption({ label: "Pago confirmado" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/estado=payment_confirmed/);
  const statusRows = page.getByRole("list", { name: "Pedidos" }).getByRole("listitem");
  await expect(statusRows.first()).toBeVisible();
  for (const row of await statusRows.all()) {
    await expect(row.getByText("Pago confirmado")).toBeVisible();
  }

  await page.goto(`/admin/pedidos?clienta=${rosa!.code}`);
  const byCustomer = page.getByRole("list", { name: "Pedidos" }).getByRole("listitem");
  await expect(byCustomer.first()).toBeVisible();
  for (const row of await byCustomer.all()) {
    await expect(row.getByText(rosa!.code)).toBeVisible();
  }

  await page.goto("/admin/pedidos?bazar=amiga");
  await expect(page.getByText("Rosa Sin Cuenta Ficticia").first()).toBeVisible();
  await page.goto("/admin/pedidos?bazar=no-existe-este-bazar");
  await expect(page.getByText("No hay pedidos con esos filtros.")).toBeVisible();
});

test("una plantilla con una variable desconocida se rechaza", async ({ page }) => {
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/configuracion");
  const field = page.getByLabel("Paquete recibido");
  const original = await field.inputValue();
  await field.fill("Hola {nombre}, llegó {regalo}");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(page.getByText(/Variables no permitidas: \{regalo\}/)).toBeVisible();
  await field.fill(original);
});

test("clientas y bazares no entran al panel", async ({ page }) => {
  await signIn(page, SEED_USERS.localCustomer, "customer");
  await page.goto("/admin/pagos");
  await expect(page).toHaveURL(/\/mi-cuenta$/);

  await signOut(page);
  await signIn(page, SEED_USERS.approvedBazaar, "bazaar");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/bazar$/);

  await signOut(page);
  await page.goto("/admin/configuracion");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin%2Fconfiguracion/);
});
