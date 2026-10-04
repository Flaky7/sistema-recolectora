import { expect, type Page } from "@playwright/test";

import { fixture } from "./auth";
import { captureWhatsApp } from "./whatsapp";

/** Confirms the pending payment of an order from /admin/pagos (collector session). */
export async function confirmPayment(page: Page, folio: number) {
  await page.goto("/admin/pagos");
  await captureWhatsApp(page, () =>
    page
      .locator("article", { hasText: `Pedido #${folio}` })
      .getByRole("button", { name: "Confirmar" })
      .click(),
  );
}

/** Registers one package for the customer's order from /admin/paquetes/nuevo. */
export async function registerPackage(page: Page, code: string, folio: number, bazaar = "Bazar E2E") {
  await page.goto("/admin/paquetes/nuevo");
  await page.getByLabel("Código de la etiqueta").fill(code);
  await page.getByRole("button", { name: new RegExp(code) }).click();
  const radio = page.getByRole("radio", { name: new RegExp(`Pedido #${folio}`) });
  if (!(await radio.isChecked())) await radio.check();
  await page.locator('input[type="file"]').setInputFiles(fixture("package.jpg"));
  await expect(page.getByRole("button", { name: "Cambiar archivo" })).toBeVisible();
  await page.getByLabel("¿De qué bazar viene?").fill(bazaar);
  await page.getByRole("button", { name: new RegExp(`Agregar “${bazaar}”`) }).click();
  return captureWhatsApp(page, () => page.getByRole("button", { name: "Guardar paquete" }).click());
}
