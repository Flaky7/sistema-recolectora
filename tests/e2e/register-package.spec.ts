import { expect, test, type Page } from "@playwright/test";

import { fixture, SEED_USERS, signIn, signOut } from "./helpers/auth";
import { createOrderAsCustomer, registerCustomer } from "./helpers/customer";
import { captureWhatsApp } from "./helpers/whatsapp";

// Critical flow "registro de paquete recibido" (constitution V; US2), on a phone and on a
// computer: the collector can do the whole job from either.

/** Phones open the camera; with a mouse the same button opens the file picker. */
async function expectPhotoButton(page: Page, project: string) {
  await expect(
    page.getByRole("button", {
      name:
        project === "mobile"
          ? "Tomar foto del paquete"
          : "Subir foto del paquete",
    }),
  ).toBeVisible();
}

test("código → pedido preseleccionado → foto → WhatsApp → la clienta ve la foto", async ({
  page,
}, testInfo) => {
  const customer = await registerCustomer(page, { name: "Paula Paquetes" });
  const folio = await createOrderAsCustomer(page, { expected: 2 });

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/pagos");
  await captureWhatsApp(page, () =>
    page
      .locator("article", { hasText: `Pedido #${folio}` })
      .getByRole("button", { name: "Confirmar" })
      .click(),
  );

  await page.goto("/admin/paquetes/nuevo");
  await page
    .getByLabel("Código de la etiqueta")
    .fill(customer.code.toLowerCase());
  await page.getByRole("button", { name: new RegExp(customer.code) }).click();
  await expect(
    page.getByRole("radio", { name: new RegExp(`Pedido #${folio}`) }),
  ).toBeChecked();
  await expect(page.getByText("Este será el paquete 1 de 2")).toBeVisible();
  await expectPhotoButton(page, testInfo.project.name);

  await page
    .locator('input[type="file"]')
    .setInputFiles(fixture("package.jpg"));
  await expect(
    page.getByRole("button", { name: "Cambiar archivo" }),
  ).toBeVisible();
  await page.getByLabel("¿De qué bazar viene?").fill("Bazar Mariposa");
  await page.getByRole("button", { name: /Agregar “Bazar Mariposa”/ }).click();

  const message = await captureWhatsApp(page, () =>
    page.getByRole("button", { name: "Guardar paquete" }).click(),
  );
  expect(message.phone).toBe(`52${customer.phone}`);
  expect(message.text).toContain("Bazar Mariposa");
  expect(message.text).toContain("1 de 2");
  expect(message.text).toContain(`/mi-cuenta/pedidos/${folio}`);

  await signOut(page);
  await signIn(page, customer.email, "customer");
  await page.goto(`/mi-cuenta/pedidos/${folio}`);
  await expect(page.getByText("Recibiendo paquetes").first()).toBeVisible();
  const photo = page.getByRole("img", { name: /Paquete 1 de Bazar Mariposa/ });
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\/package-photos\//,
  );

  await signOut(page);
  await signIn(page, SEED_USERS.outOfTownCustomer, "customer");
  const response = await page.goto(`/mi-cuenta/pedidos/${folio}`);
  expect(response?.status()).toBe(404);
});

test("código desconocido → aviso y paquete sin identificar sin mensaje", async ({
  page,
}, testInfo) => {
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/paquetes/nuevo");
  await page.getByLabel("Código de la etiqueta").fill("ZZZZZ");
  await expect(page.getByText(/No existe una clienta con/)).toBeVisible();

  await page.getByRole("button", { name: /sin identificar/ }).click();
  await expectPhotoButton(page, testInfo.project.name);
  await page
    .locator('input[type="file"]')
    .setInputFiles(fixture("package.jpg"));
  await expect(
    page.getByRole("button", { name: "Cambiar archivo" }),
  ).toBeVisible();
  await page.getByLabel("¿De qué bazar viene?").fill("Etiqueta ilegible");
  await page
    .getByRole("button", { name: /Agregar “Etiqueta ilegible”/ })
    .click();
  await page.getByRole("button", { name: "Guardar paquete" }).click();
  await expect(page.getByText("Paquete guardado")).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir WhatsApp" })).toHaveCount(
    0,
  );

  await page.goto("/admin/paquetes?filtro=sin-identificar");
  await expect(page.getByText("Etiqueta ilegible").first()).toBeVisible();
});
