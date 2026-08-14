import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test("configures a Mobup studio, orbits and zooms it, switches language and downloads a PDF", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");
  const readyStatus = page.getByText(
    /3D view ready|3D preview unavailable|Vue 3D prête|Aperçu 3D indisponible/,
  );
  await expect(readyStatus).toBeVisible({ timeout: 20_000 });

  const viewer = page.locator(".studio-viewer");
  await expect(viewer).toHaveAttribute(
    "aria-label",
    /Visualisation 3D interactive du studio de jardin Mobup(?: avec ClayGL)?/,
  );
  const canvas = page.locator("canvas.studio-viewer__canvas");
  await expect(canvas).toHaveAttribute(
    "aria-label",
    /Mobup 3D studio viewer(?: rendered with ClayGL)?/,
  );
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
  const poolEnvironment = page.locator(".mobup-environment-card--pool");
  await poolEnvironment.click({ force: true });
  await expect(poolEnvironment).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(readyStatus).toBeVisible({ timeout: 20_000 });
  await expect(poolEnvironment).toHaveAttribute("aria-pressed", "true");
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
  const downloadButton = page.getByRole("button", {
    name: /Télécharger l’estimation PDF/,
  });
  await expect(downloadButton).toHaveAttribute("data-state", "idle");
  const download = page.waitForEvent("download");
  await downloadButton.click({ force: true });
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/mobup-estimate-p4\.pdf/);
  await expect(
    page.getByRole("button", { name: /PDF téléchargé/ }),
  ).toHaveAttribute("data-state", "ready");
  expect(consoleErrors).toEqual([]);
});
