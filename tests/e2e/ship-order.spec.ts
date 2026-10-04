import { expect, test } from "@playwright/test";

import { SEED_USERS, signIn, signOut } from "./helpers/auth";
import { confirmPayment, registerPackage } from "./helpers/collector";
import { createOrderAsCustomer, registerCustomer } from "./helpers/customer";
import { captureWhatsApp } from "./helpers/whatsapp";

// Critical flow "envío" (constitution V; US3).
test("pedido incompleto → confirmación → envío por paquetería → entregado", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const customer = await registerCustomer(page, {
    type: "out_of_town",
    name: "Olga Foránea",
  });
  const folio = await createOrderAsCustomer(page, { expected: 2 });

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await confirmPayment(page, folio);
  await registerPackage(page, customer.code, folio);

  await page.goto(`/admin/pedidos/${folio}`);
  await page.getByRole("button", { name: "Marcar completo" }).click();
  await expect(page.getByText("Llegaron 1 de 2 paquetes")).toBeVisible();
  await page.getByRole("button", { name: "Sí, marcar completo" }).click();
  await expect(
    page.getByRole("heading", { name: "Registrar envío" }),
  ).toBeVisible();

  // Out-of-town customers only get "Paquetería" (FR-021).
  await expect(
    page.getByRole("radio", { name: "Entrega en persona" }),
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "Paquetería" }).fill("Estafeta");
  await page.getByLabel("Número de guía").fill("EST987654321");
  await page.getByLabel("Costo de envío (pesos)").fill("189.50");
  const message = await captureWhatsApp(page, () =>
    page.getByRole("button", { name: "Registrar envío" }).click(),
  );
  expect(message.phone).toBe(`52${customer.phone}`);
  expect(message.text).toContain(`#${folio}`);
  expect(message.text).toContain("Estafeta");
  expect(message.text).toContain("EST987654321");
  expect(message.text).toContain("$189.50");

  await signOut(page);
  await signIn(page, customer.email, "customer");
  await page.goto(`/mi-cuenta/pedidos/${folio}`);
  await expect(page.getByText("Enviado").first()).toBeVisible();
  await expect(page.getByText("EST987654321")).toBeVisible();
  await expect(page.getByText("$189.50")).toBeVisible();

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto(`/admin/pedidos/${folio}`);
  await page.getByRole("button", { name: "Marcar entregado" }).click();
  await expect(page.getByText("Entregado").first()).toBeVisible();
});

test("clienta local → entrega en persona sin guía", async ({ page }) => {
  test.setTimeout(90_000);
  const customer = await registerCustomer(page, {
    type: "local",
    name: "Lucía Local",
  });
  const folio = await createOrderAsCustomer(page, { expected: 1 });

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await confirmPayment(page, folio);
  await registerPackage(page, customer.code, folio);

  await page.goto(`/admin/pedidos/${folio}`);
  await page.getByRole("button", { name: "Marcar completo" }).click();
  await expect(
    page.getByRole("heading", { name: "Registrar envío" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Entrega en persona" }).check();
  await expect(page.getByLabel("Número de guía")).toHaveCount(0);
  const message = await captureWhatsApp(page, () =>
    page.getByRole("button", { name: "Registrar envío" }).click(),
  );
  expect(message.text).toContain("entrega en persona");
  expect(message.text).not.toContain("Número de guía");
});
