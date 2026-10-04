import { expect, test } from "@playwright/test";

import { SEED_USERS, signIn, signOut, uniquePhone } from "./helpers/auth";
import { registerCustomer } from "./helpers/customer";

// FR-041 to FR-045: customer registered by the collector, who later claims her account.
test("alta sin cuenta → pedido con pago anotado → la clienta reclama su cuenta", async ({
  page,
}) => {
  const phone = uniquePhone();

  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/clientas/nueva");
  await page.getByLabel("Nombre completo").fill("Rosa Sin Cuenta E2E");
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByLabel("Dirección de envío").fill("Avenida de Prueba 456, Tijuana");
  await page.getByText("Local", { exact: true }).click();
  await page.getByRole("button", { name: "Dar de alta" }).click();

  const code = (await page.locator("p.font-mono").first().innerText()).trim();
  expect(code).toMatch(/^[2-9A-HJ-NP-Z]{5}$/);
  const share = page.getByRole("link", { name: "Compartir código por WhatsApp" });
  await expect(share).toHaveAttribute("href", new RegExp(`wa\\.me/52${phone}.*${code}`));

  await page.getByRole("link", { name: "Registrar pedido" }).click();
  await page.getByLabel("¿En qué bazar o bazares compraste?").fill("Bazar de una amiga");
  await page.getByRole("button", { name: /Agregar “Bazar de una amiga”/ }).click();
  await page.getByLabel("¿Qué compraste?").fill("Ropa de bebé");
  await page.getByLabel("¿Cuántos paquetes esperas?").fill("1");
  await page.getByLabel("Anotar pago inicial recibido").check();
  await page.getByRole("button", { name: "Registrar pedido" }).click();
  await expect(page).toHaveURL(/\/admin\/pedidos\/\d+$/);
  const folio = Number(page.url().split("/").pop());
  await expect(page.getByText("Pago confirmado").first()).toBeVisible();

  await signOut(page);
  const customer = await registerCustomer(page, { phone, code: code.toLowerCase() });
  expect(customer.code).toBe(code);
  await expect(page.getByText(`Pedido #${folio}`)).toBeVisible();
});
