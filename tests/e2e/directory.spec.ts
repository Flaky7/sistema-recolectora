import { expect, test } from "@playwright/test";

// US6: public directory, no session.
test.describe("directorio público", () => {
  test("buscar por marca sin acentos y abrir la página del bazar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Buscar por bazar o marca").fill("zara");
    await expect(page).toHaveURL(/\?q=zara/);
    // Seed: "Bazar Ñandú" sells "Zára" (approved); "Bazar Pendiente" also has Zara but is not approved.
    const card = page.locator("article", { hasText: "Bazar Ñandú" });
    await expect(card).toBeVisible();
    await expect(
      page.locator("article", { hasText: "Bazar Pendiente" }),
    ).toHaveCount(0);
    const link = card.getByRole("link", { name: "Ver su página" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("un bazar sin fotos se ve como recuadro sin imágenes", async ({
    page,
  }) => {
    await page.goto("/?q=adidas");
    const card = page
      .locator("article", { hasText: "Bazar Sin Fotos" })
      .first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("img")).toHaveCount(0);
    await expect(card.getByText("Nike")).toBeVisible();
  });

  test("búsqueda sin resultados muestra el mensaje vacío", async ({ page }) => {
    await page.goto("/");
    await page
      .getByLabel("Buscar por bazar o marca")
      .fill("marca-que-no-existe");
    await expect(
      page.getByText("No encontramos bazares con esa búsqueda."),
    ).toBeVisible();
  });

  test("el directorio no expone datos privados", async ({ page }) => {
    await page.goto("/?q=zara");
    const html = await page.content();
    expect(html).not.toContain("bazaar-documents");
    expect(html).not.toContain("Referencia Uno");
    expect(html).not.toContain("6640000001");
  });
});
