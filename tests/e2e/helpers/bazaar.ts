import { expect, type Page } from "@playwright/test";

import { fixture, getEmailLink, PASSWORD, uniqueEmail } from "./auth";

/** Creates a bazaar account through /registro/bazar and confirms it via Mailpit. */
export async function registerBazaarAccount(page: Page) {
  const email = uniqueEmail("bazar");
  await page.goto("/registro/bazar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByLabel(/Leí y acepto/).check();
  await page.getByRole("button", { name: "Crear cuenta de bazar" }).click();
  await expect(page.getByText("Revisa tu correo")).toBeVisible();
  await page.goto(await getEmailLink(email));
  await expect(page).toHaveURL(/\/bazar/);
  return email;
}

export async function fillPublicProfile(
  page: Page,
  {
    name,
    brands,
    photos = [],
  }: { name: string; brands: string[]; photos?: string[] },
) {
  await page.getByLabel("Nombre del bazar").fill(name);
  for (const brand of brands) {
    await page.getByLabel("Marcas que manejas").fill(brand);
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
  }
  await page
    .getByLabel("Link de tu página o perfil")
    .fill(`https://www.facebook.com/${name.toLowerCase().replace(/\s+/g, "")}`);
  for (const [index, photo] of photos.entries()) {
    await page
      .getByLabel("Elegir foto del bazar")
      .setInputFiles(fixture(photo));
    await expect(
      page.getByRole("img", { name: `Foto ${index + 1}` }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Guardar datos públicos" }).click();
  await expect(page.getByText("Datos públicos guardados.")).toBeVisible();
}

const DOCUMENTS = {
  id_card: ["Credencial", "id-card.jpg"],
  selfie: ["Foto de la persona", "selfie.jpg"],
  proof_of_address: ["Comprobante de domicilio", "proof-of-address.jpg"],
  registration_payment: ["Comprobante de pago de registro", "proof.pdf"],
} as const;

export async function uploadDocument(page: Page, type: keyof typeof DOCUMENTS) {
  const [label, file] = DOCUMENTS[type];
  await page
    .getByLabel(`Archivo: ${label}`, { exact: true })
    .setInputFiles(fixture(file));
  await expect(
    page.getByTestId(`document-${type}`).getByText(/En revisión/),
  ).toBeVisible();
}

export async function fillReferences(page: Page) {
  for (const i of [1, 2, 3]) {
    await page
      .getByLabel(`Nombre de la referencia ${i}`)
      .fill(`Referencia Número ${i}`);
    await page
      .getByLabel(`Teléfono de la referencia ${i}`)
      .fill(`664555000${i}`);
  }
  await page.getByRole("button", { name: "Guardar referencias" }).click();
  await expect(page.getByText("Referencias guardadas.")).toBeVisible();
}

/** Completes a registration and submits it; returns the bazaar account email. */
export async function registerCompleteBazaar(
  page: Page,
  profile: { name: string; brands: string[]; photos?: string[] },
) {
  const email = await registerBazaarAccount(page);
  await fillPublicProfile(page, profile);
  for (const type of Object.keys(DOCUMENTS) as (keyof typeof DOCUMENTS)[]) {
    await uploadDocument(page, type);
  }
  await fillReferences(page);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Pendiente de revisión").first()).toBeVisible();
  return email;
}

/** As the collector: opens the bazaar from "Por revisar" and approves it. */
export async function approveBazaar(page: Page, name: string) {
  await page.goto("/admin/bazares?estado=pending_review");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name: "Documentos" })).toBeVisible();
  await page.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Aprobado", { exact: true })).toBeVisible();
}

export function uniqueBazaarName(prefix: string) {
  return `${prefix} ${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
