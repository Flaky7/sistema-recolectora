import { expect, type Page } from "@playwright/test";

import { fixture, getEmailLink, PASSWORD, uniqueEmail, uniquePhone } from "./auth";

/** Signs up through /registro/clienta and confirms the email via Mailpit. Returns the code. */
export async function registerCustomer(
  page: Page,
  options: { phone?: string; code?: string; name?: string } = {},
) {
  const email = uniqueEmail("clienta");
  const phone = options.phone ?? uniquePhone();
  await page.goto("/registro/clienta");
  await page.getByLabel("Nombre completo").fill(options.name ?? "Clienta E2E");
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByLabel("Dirección de envío").fill("Calle de Prueba 123, Tijuana, B.C.");
  await page.getByText("Local", { exact: true }).click();
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByLabel(/Leí y acepto/).check();
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();

  if (options.code) {
    const codeField = page.getByLabel("Código de clienta");
    await expect(codeField).toBeVisible();
    await codeField.fill(options.code);
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  }

  await expect(page.getByText("Revisa tu correo")).toBeVisible();
  const link = await getEmailLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/mi-cuenta/);
  const code = (await page.locator("section", { hasText: "Tu código de clienta" }).locator("p.font-mono").innerText()).trim();
  expect(code).toMatch(/^[2-9A-HJ-NP-Z]{5}$/);
  return { email, phone, code };
}

/** Creates an order from /mi-cuenta/pedidos/nuevo and returns its folio. */
export async function createOrderAsCustomer(
  page: Page,
  options: { bazaar?: string; withProof?: boolean; expected?: number } = {},
) {
  await page.goto("/mi-cuenta/pedidos/nuevo");
  const bazaar = options.bazaar ?? "Bazar de Prueba E2E";
  await page.getByLabel("¿En qué bazar o bazares compraste?").fill(bazaar);
  await page.getByRole("button", { name: new RegExp(`Agregar “${bazaar}”`) }).click();
  await page.getByLabel("¿Qué compraste?").fill("Dos blusas y un pantalón");
  await page.getByLabel("¿Cuántos paquetes esperas?").fill(String(options.expected ?? 2));
  if (options.withProof ?? true) {
    await page.locator('input[type="file"]').setInputFiles(fixture("payment-proof.jpg"));
    await expect(page.getByRole("button", { name: "Cambiar archivo" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Registrar pedido" }).click();
  await expect(page).toHaveURL(/\/mi-cuenta\/pedidos\/\d+$/);
  return Number(page.url().split("/").pop());
}
