import { expect, test } from "@playwright/test";

test("configures a Mobup studio, orbits and zooms it, switches language and downloads a PDF", async ({
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
  const canvas = page.locator("canvas.studio-viewer__canvas");
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox) {
    const x = canvasBox.x + canvasBox.width * 0.52;
    const y = canvasBox.y + canvasBox.height * 0.48;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 110, y + 18, { steps: 8 });
    await page.mouse.up();
    await page.mouse.wheel(0, -240);
    await expect(canvas).toBeVisible();
  }
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
