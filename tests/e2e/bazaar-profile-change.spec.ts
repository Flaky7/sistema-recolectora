import { expect, test, type Page } from "@playwright/test";

import { fixture, SEED_USERS, signIn, signOut } from "./helpers/auth";
import {
  approveBazaar,
  registerCompleteBazaar,
  uniqueBazaarName,
} from "./helpers/bazaar";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

function pathFromSrc(src: string, bucket: string) {
  const match = src.match(new RegExp(`/${bucket}/([^?]+)`));
  if (!match?.[1]) throw new Error(`sin ruta en ${src}`);
  return decodeURIComponent(match[1]);
}

async function publicStatus(page: Page, bucket: string, path: string) {
  const response = await page.request.get(
    `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
  );
  return response.status();
}

// FR-029 to FR-031: changes of an approved bazaar are only published once authorized.
test("cambio de nombre y foto → rechazado con motivo → reenviado → autorizado", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const name = uniqueBazaarName("Bazar Original");
  const suffix = name.split(" ").at(-1)!;
  const newName = `Bazar Renovado ${suffix}`;
  const email = await registerCompleteBazaar(page, {
    name,
    brands: ["Gap"],
    photos: ["bazaar-1.jpg"],
  });

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await approveBazaar(page, name);
  await page.goto(`/?q=${suffix}`);
  const oldSrc = (await page
    .locator("article", { hasText: name })
    .getByRole("img")
    .getAttribute("src"))!;
  const oldPath = pathFromSrc(oldSrc, "bazaar-photos");

  // The bazaar proposes a new name and replaces the photo.
  await signOut(page);
  await signIn(page, email, "bazaar");
  await page.getByRole("button", { name: "Proponer cambios" }).click();
  await page.getByLabel("Nombre del bazar").fill(newName);
  await page.getByRole("button", { name: "Quitar foto 1" }).click();
  await page
    .getByLabel("Elegir foto del bazar")
    .setInputFiles(fixture("bazaar-2.jpg"));
  await expect(page.getByRole("img", { name: "Foto 1" })).toBeVisible();
  await page.getByRole("button", { name: "Enviar cambio a revisión" }).click();
  await expect(page.getByText("Cambio en revisión").first()).toBeVisible();

  const proposalCard = page.locator("article", { hasText: newName });
  const newSrc = (await proposalCard.getByRole("img").getAttribute("src"))!;
  const newPath = pathFromSrc(newSrc, "bazaar-photo-submissions");

  // Nothing new is public yet.
  await page.goto(`/?q=${suffix}`);
  await expect(page.locator("article", { hasText: name })).toBeVisible();
  await expect(page.locator("article", { hasText: newName })).toHaveCount(0);
  expect(
    await publicStatus(page, "bazaar-photos", newPath),
  ).toBeGreaterThanOrEqual(400);
  expect(
    await publicStatus(page, "bazaar-photo-submissions", newPath),
  ).toBeGreaterThanOrEqual(400);

  // The collector compares and rejects with a reason.
  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/bazares?estado=cambios");
  await page
    .getByRole("link", { name: new RegExp(`Propone: ${newName}`) })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cambio por autorizar" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Publicado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Propuesta" })).toBeVisible();
  await page.getByRole("button", { name: "Rechazar" }).click();
  await page
    .getByLabel("Motivo del rechazo")
    .fill("La foto no corresponde a tu bazar");
  await page.getByRole("button", { name: "Rechazar" }).last().click();
  await expect(
    page.getByRole("heading", { name: "Cambio por autorizar" }),
  ).toHaveCount(0);

  // The bazaar sees the reason and proposes again.
  await signOut(page);
  await signIn(page, email, "bazaar");
  await expect(
    page.getByText("Motivo: La foto no corresponde a tu bazar"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Proponer cambios" }).click();
  await page.getByLabel("Nombre del bazar").fill(newName);
  await page.getByRole("button", { name: "Quitar foto 1" }).click();
  await page
    .getByLabel("Elegir foto del bazar")
    .setInputFiles(fixture("bazaar-3.jpg"));
  await expect(page.getByRole("img", { name: "Foto 1" })).toBeVisible();
  await page.getByRole("button", { name: "Enviar cambio a revisión" }).click();
  await expect(page.getByText("Cambio en revisión").first()).toBeVisible();

  // The collector authorizes: the directory shows the new version, the old photo is gone.
  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/bazares?estado=cambios");
  await page
    .getByRole("link", { name: new RegExp(`Propone: ${newName}`) })
    .click();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await expect(
    page.getByRole("heading", { name: "Cambio por autorizar" }),
  ).toHaveCount(0);

  await page.goto(`/?q=${suffix}`);
  const published = page.locator("article", { hasText: newName });
  await expect(published).toBeVisible();
  await expect(published.getByRole("img")).toHaveAttribute(
    "src",
    /\/object\/public\/bazaar-photos\//,
  );
  expect(
    await publicStatus(page, "bazaar-photos", oldPath),
  ).toBeGreaterThanOrEqual(400);
});
