import { expect, test } from "@playwright/test";

import {
  fillPublicProfile,
  fillReferences,
  registerBazaarAccount,
  registerCompleteBazaar,
  uploadDocument,
} from "./helpers/bazaar";

// Critical flow "registro de bazar" (constitution V; US4).
test("cuenta → ficha sin fotos → falta un documento → completo → pendiente de revisión", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await registerBazaarAccount(page);
  await expect(page.getByText("Registro incompleto")).toBeVisible();

  await fillPublicProfile(page, {
    name: "Bazar Sin Fotos E2E",
    brands: ["Shein", "Zara"],
  });
  await uploadDocument(page, "id_card");
  await uploadDocument(page, "selfie");
  await uploadDocument(page, "proof_of_address");
  await fillReferences(page);

  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "los 4 documentos" }),
  ).toBeVisible();
  await expect(page.getByText("Pendiente de revisión")).toHaveCount(0);

  await uploadDocument(page, "registration_payment");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Pendiente de revisión").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vista previa" }),
  ).toBeVisible();
});

test("ficha con 2 fotos → la vista previa las muestra", async ({ page }) => {
  test.setTimeout(90_000);
  await registerCompleteBazaar(page, {
    name: "Bazar Con Fotos E2E",
    brands: ["Mango"],
    photos: ["bazaar-1.jpg", "bazaar-2.jpg"],
  });
  const preview = page.locator("article", { hasText: "Bazar Con Fotos E2E" });
  await expect(preview.getByRole("img")).toHaveCount(2);
  await expect(preview.getByRole("img").first()).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\/bazaar-photo-submissions\//,
  );
});
