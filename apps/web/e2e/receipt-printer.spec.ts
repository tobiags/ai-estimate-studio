import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (type.includes("webgl")) return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
});

test("feeds a readable receipt outside the machine before downloading, and can print again", async ({
  page,
}) => {
  const printer = page.locator(".mobup-download-printer");
  const button = printer.getByRole("button");
  await printer.scrollIntoViewIfNeeded();
  for (let attempt = 0; attempt < 2; attempt++) {
    const download = page.waitForEvent("download");
    await button.click();
    await expect(printer).toHaveAttribute("data-state", "printing");
    await expect(button).toBeDisabled();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/mobup-estimate-.*\.pdf/);
    await expect(printer).toHaveAttribute("data-state", "ready");
    const paper = printer.locator(".mobup-download-printer__receipt");
    await expect(paper).toContainText("MOBUP");
    const machineBounds = await printer
      .locator(".mobup-download-printer__device")
      .boundingBox();
    const paperBounds = await paper.boundingBox();
    expect(paperBounds!.y + paperBounds!.height).toBeGreaterThan(
      machineBounds!.y + machineBounds!.height + 100,
    );
  }
});

test("downloads without paper motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const printer = page.locator(".mobup-download-printer");
  const download = page.waitForEvent("download");
  await printer.getByRole("button").click();
  await download;
  await expect(printer).toHaveAttribute("data-state", "ready");
  expect(
    await printer
      .locator("article")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
