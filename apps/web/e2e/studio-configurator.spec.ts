import { expect, test } from "@playwright/test";

test("configures a Mobup studio, orbits it, switches language and downloads a PDF", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");
  await expect(
    page.getByText(/3D view ready|3D preview unavailable/),
  ).toBeVisible();

  const viewer = page.locator(".studio-viewer");
  await expect(viewer).toHaveAttribute(
    "aria-label",
    "Visualisation 3D interactive du studio de jardin Mobup",
  );
  await page.locator(".mobup-switch").click({ force: true });
  await expect(page.getByText("Hide analysis")).toBeVisible();

  await page.getByRole("button", { name: "Remove M8" }).click({ force: true });
  await page.getByRole("button", { name: /^M2 / }).click({ force: true });
  await expect(page.getByText(/3,25 m/)).toBeVisible();
  await expect(page.locator(".mobup-quote-total strong")).toHaveText("€5,244");

  await page.locator(".mobup-language button").nth(1).click({ force: true });
  await expect(
    page.getByRole("heading", { name: /Votre studio de jardin/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Télécharger l’estimation PDF/ })
    .click({ force: true });
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/mobup-estimate-p4\.pdf/);
  expect(consoleErrors).toEqual([]);
});
