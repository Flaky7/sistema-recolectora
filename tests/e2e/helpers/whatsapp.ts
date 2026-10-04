import { expect, type Page } from "@playwright/test";

/**
 * Runs `action` and returns the decoded WhatsApp message. On phones the app navigates to wa.me
 * by itself; on desktop it shows an "Abrir WhatsApp" link. wa.me is stubbed so tests never
 * leave the machine.
 */
export async function captureWhatsApp(
  page: Page,
  action: () => Promise<void>,
): Promise<{ url: string; phone: string; text: string }> {
  await page.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body>WhatsApp</body></html>" }),
  );
  const navigated = page
    .waitForRequest((request) => request.url().startsWith("https://wa.me/"), { timeout: 20_000 })
    .then((request) => request.url());
  const linked = page
    .getByRole("link", { name: "Abrir WhatsApp" })
    .getAttribute("href", { timeout: 20_000 })
    .then((href) => {
      if (!href) throw new Error("sin enlace");
      return href;
    });

  await action();
  const url = await Promise.any([navigated, linked]);
  expect(url).toMatch(/^https:\/\/wa\.me\/52\d{10}\?text=/);
  const parsed = new URL(url);
  return {
    url,
    phone: parsed.pathname.slice(1),
    text: parsed.searchParams.get("text") ?? "",
  };
}
