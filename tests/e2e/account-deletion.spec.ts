import { expect, test } from "@playwright/test";

import { PASSWORD, SEED_USERS, signIn, signOut } from "./helpers/auth";
import { registerCustomer } from "./helpers/customer";

// FR-046 and FR-049.
test("una clienta sin pedidos elimina su cuenta y ya no puede entrar", async ({
  page,
}) => {
  const customer = await registerCustomer(page, { name: "Clienta Que Se Va" });
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  const confirm = page.getByRole("button", {
    name: "Eliminar definitivamente",
  });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Escribe ELIMINAR para confirmar").fill("eliminar");
  await confirm.click();
  await expect(page).toHaveURL(/\/\?cuenta=eliminada/);
  await expect(
    page.getByText("Tu cuenta y tus datos personales fueron eliminados."),
  ).toBeVisible();

  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(customer.email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByText("El correo o la contraseña no son correctos."),
  ).toBeVisible();
});

test("la recolectora da de baja temporal a una clienta, que ve el aviso, y la reactiva", async ({
  page,
}) => {
  const customer = await registerCustomer(page, { name: "Clienta Pausada" });

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto(`/admin/clientas/${customer.code}`);
  await page.getByRole("button", { name: "Dar de baja temporal" }).click();
  await page.getByRole("button", { name: "Dar de baja" }).last().click();
  await expect(page.getByText("Dada de baja temporal").first()).toBeVisible();

  await signOut(page);
  await signIn(page, customer.email, "customer");
  await expect(
    page.getByText(/Tu cuenta está dada de baja temporalmente/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo pedido" })).toHaveCount(1); // only the nav link
  await page.goto("/mi-cuenta/pedidos/nuevo");
  await expect(page.getByText(/no puedes registrar pedidos/)).toBeVisible();

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto(`/admin/clientas/${customer.code}`);
  await page.getByRole("button", { name: "Reactivar" }).click();
  await expect(
    page.getByRole("button", { name: "Dar de baja temporal" }),
  ).toBeVisible();

  await signOut(page);
  await signIn(page, customer.email, "customer");
  await expect(
    page.getByText(/Tu cuenta está dada de baja temporalmente/),
  ).toHaveCount(0);
});
