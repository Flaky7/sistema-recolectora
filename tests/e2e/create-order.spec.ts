import { expect, test } from "@playwright/test";

import { SEED_USERS, signIn, signOut } from "./helpers/auth";
import { createOrderAsCustomer, registerCustomer } from "./helpers/customer";
import { captureWhatsApp } from "./helpers/whatsapp";

// Critical flow "creación de pedido" (constitution V; US1).
test.describe("crear pedido y revisar el pago", () => {
  test("registro → código → pedido con comprobante → pago confirmado", async ({
    page,
  }) => {
    const customer = await registerCustomer(page);
    await expect(page.getByText(customer.code, { exact: true })).toBeVisible();

    const folio = await createOrderAsCustomer(page);
    await expect(
      page.getByText("Pago inicial pendiente").first(),
    ).toBeVisible();

    await signOut(page);
    await signIn(page, SEED_USERS.collector, "collector");
    await page.goto("/admin/pagos");
    const card = page.locator("article", { hasText: `Pedido #${folio}` });
    await expect(card).toBeVisible();

    const message = await captureWhatsApp(page, () =>
      card.getByRole("button", { name: "Confirmar" }).click(),
    );
    expect(message.phone).toBe(`52${customer.phone}`);
    expect(message.text).toContain(`#${folio}`);
    expect(message.text).toContain("Confirmamos tu pago");

    await signOut(page);
    await signIn(page, customer.email, "customer");
    await page.goto(`/mi-cuenta/pedidos/${folio}`);
    await expect(page.getByText("Pago confirmado").first()).toBeVisible();
  });

  test("pago rechazado con motivo → la clienta sube otro comprobante", async ({
    page,
  }) => {
    await signIn(page, SEED_USERS.localCustomer, "customer");
    const folio = await createOrderAsCustomer(page);

    await signOut(page);
    await signIn(page, SEED_USERS.collector, "collector");
    await page.goto("/admin/pagos");
    const card = page.locator("article", { hasText: `Pedido #${folio}` });
    await card.getByRole("button", { name: "Rechazar" }).click();
    await page.getByLabel("Motivo del rechazo").fill("El monto no coincide");
    const message = await captureWhatsApp(page, () =>
      page.getByRole("button", { name: "Rechazar pago" }).click(),
    );
    expect(message.text).toContain("El monto no coincide");
    expect(message.text).toContain(`/mi-cuenta/pedidos/${folio}`);

    await signOut(page);
    await signIn(page, SEED_USERS.localCustomer, "customer");
    await page.goto(`/mi-cuenta/pedidos/${folio}`);
    await expect(
      page.getByText("Motivo: El monto no coincide").first(),
    ).toBeVisible();
    await page
      .locator('input[type="file"]')
      .setInputFiles("tests/e2e/fixtures/proof.pdf");
    await page.getByRole("button", { name: "Enviar comprobante" }).click();
    await expect(
      page.getByText("Pago inicial pendiente").first(),
    ).toBeVisible();
  });

  test("otra clienta no puede abrir el pedido", async ({ page }) => {
    await signIn(page, SEED_USERS.localCustomer, "customer");
    const folio = await createOrderAsCustomer(page, { withProof: false });
    await expect(page.getByText("Registrado").first()).toBeVisible();

    await signOut(page);
    await signIn(page, SEED_USERS.outOfTownCustomer, "customer");
    const response = await page.goto(`/mi-cuenta/pedidos/${folio}`);
    expect(response?.status()).toBe(404);
  });
});
