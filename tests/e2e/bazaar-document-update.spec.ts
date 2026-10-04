import { expect, test } from "@playwright/test";

import { adminClient } from "../helpers/supabase";

import { fixture, SEED_USERS, signIn, signOut } from "./helpers/auth";
import { approveBazaar, registerCompleteBazaar, uniqueBazaarName } from "./helpers/bazaar";

async function proofOfAddressRows(email: string) {
  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
  const { data: bazaar } = await admin.from("bazaars").select("id").eq("profile_id", profile!.id).single();
  const { data } = await admin
    .from("bazaar_documents")
    .select("id, status, storage_path")
    .eq("bazaar_id", bazaar!.id)
    .eq("type", "proof_of_address");
  return data ?? [];
}

async function fileExists(path: string) {
  const [folder, name] = path.split("/") as [string, string];
  const { data } = await adminClient().storage.from("bazaar-documents").list(folder, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

// FR-032 to FR-034: a new document stays under review while the current one remains valid.
test("nuevo comprobante → rechazado con motivo → otro → autorizado; el anterior se borra", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const name = uniqueBazaarName("Bazar Documentado");
  const email = await registerCompleteBazaar(page, { name, brands: ["Nike"] });
  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await approveBazaar(page, name);
  const [original] = await proofOfAddressRows(email);
  expect(original?.status).toBe("current");

  const slot = page.getByTestId("document-proof_of_address");
  const upload = async () => {
    await page
      .getByLabel("Archivo: Comprobante de domicilio", { exact: true })
      .setInputFiles(fixture("proof-of-address.jpg"));
    await expect(slot.getByText(/En revisión/)).toBeVisible();
  };

  await signOut(page);
  await signIn(page, email, "bazaar");
  await upload();
  await expect(slot.getByText(/Vigente desde/)).toBeVisible();

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/bazares?estado=cambios");
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await expect(page.getByRole("button", { name: "Ver vigente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver nuevo" })).toBeVisible();
  await page.getByRole("button", { name: "Rechazar" }).click();
  await page.getByLabel("Motivo del rechazo").fill("La dirección no se lee");
  await page.getByRole("button", { name: "Rechazar" }).last().click();
  await expect(page.getByRole("heading", { name: "Documentos por autorizar" })).toHaveCount(0);

  await signOut(page);
  await signIn(page, email, "bazaar");
  await expect(slot.getByText("Rechazado: La dirección no se lee")).toBeVisible();
  const afterReject = await proofOfAddressRows(email);
  expect(afterReject.find((d) => d.status === "current")?.id).toBe(original!.id);

  await upload();

  await signOut(page);
  await signIn(page, SEED_USERS.collector, "collector");
  await page.goto("/admin/bazares?estado=cambios");
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await expect(page.getByRole("heading", { name: "Documentos por autorizar" })).toHaveCount(0);

  const final = await proofOfAddressRows(email);
  const current = final.filter((d) => d.status === "current");
  expect(current).toHaveLength(1);
  expect(current[0]!.id).not.toBe(original!.id);
  expect(await fileExists(original!.storage_path!)).toBe(false);
  expect(await fileExists(current[0]!.storage_path!)).toBe(true);
});
