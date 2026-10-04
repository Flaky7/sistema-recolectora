import { expect, test } from "@playwright/test";

import { PASSWORD, SEED_USERS, signIn, signOut } from "./helpers/auth";
import { registerCompleteBazaar, uniqueBazaarName } from "./helpers/bazaar";

// Critical flow "aprobación" (constitution V; US5, US6).
test("revisar → aprobar → aparece en el directorio → suspender → desaparece", async ({ page }) => {
  test.setTimeout(120_000);
  const name = uniqueBazaarName("Bazar Aprobable");
  const email = await registerCompleteBazaar(page, {
    name,
    brands: ["Bershka"],
    photos: ["bazaar-1.jpg"],
  });

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/bazares?estado=pending_review");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name: "Referencias" })).toBeVisible();
  await expect(page.getByRole("link", { name: "6645550001" })).toHaveAttribute("href", "tel:6645550001");
  await expect(page.getByRole("button", { name: "Ver" })).toHaveCount(4);
  await expect(page.getByRole("img", { name: new RegExp(`${name}, foto 1`) })).toBeVisible();
  await page.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Aprobado", { exact: true })).toBeVisible();

  await page.goto(`/?q=${encodeURIComponent(name.split(" ").at(-1)!)}`);
  const card = page.locator("article", { hasText: name });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/bazaar-photos\//);
  await expect(card.getByRole("link", { name: "Ver su página" })).toHaveAttribute("target", "_blank");

  await page.goto("/admin/bazares?estado=approved");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: "Suspender" }).click();
  await page.getByLabel("Motivo de la suspensión").fill("Publicaciones engañosas");
  await page.getByRole("button", { name: "Suspender" }).last().click();
  await expect(page.getByText("Suspendido", { exact: true })).toBeVisible();

  await page.goto(`/?q=${encodeURIComponent(name.split(" ").at(-1)!)}`);
  await expect(page.getByText("No encontramos bazares con esa búsqueda.")).toBeVisible();

  await signOut(page);
  await signIn(page, email, "bazaar", PASSWORD);
  await expect(page.getByText("Motivo: Publicaciones engañosas")).toBeVisible();
});
