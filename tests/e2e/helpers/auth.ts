import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Prueba123!";

/** Users created by supabase/seed.sql. */
export const SEED_USERS = {
  collector: "recolectora@test.local",
  localCustomer: "clienta.local@test.local",
  outOfTownCustomer: "clienta.foranea@test.local",
  draftBazaar: "bazar.borrador@test.local",
  pendingBazaar: "bazar.pendiente@test.local",
  approvedBazaar: "bazar.aprobado@test.local",
  noPhotosBazaar: "bazar.sinfotos@test.local",
  changeBazaar: "bazar.cambio@test.local",
  suspendedBazaar: "bazar.suspendido@test.local",
} as const;

const HOME = { collector: "/admin", customer: "/mi-cuenta", bazaar: "/bazar" } as const;

export async function signIn(
  page: Page,
  email: string,
  expectedHome: keyof typeof HOME,
  password = PASSWORD,
) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`${HOME[expectedHome]}(\\?|$)`));
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
}

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitList = { messages: { ID: string; To: { Address: string }[] }[] };

/** Waits for the confirmation email sent to `email` and returns the link inside it. */
export async function getEmailLink(email: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (
      await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as MailpitList;
    const message = list.messages?.[0];
    if (message) {
      const detail = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as {
        HTML: string;
      };
      const match = detail.HTML.match(/href="([^"]*\/auth\/callback[^"]*)"/);
      if (match?.[1]) return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó el correo para ${email}`);
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@e2e.test`;
}

export function uniquePhone() {
  return `8${Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, "0")}`;
}

export const fixture = (name: string) => `tests/e2e/fixtures/${name}`;
