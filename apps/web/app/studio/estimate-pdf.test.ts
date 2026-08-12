import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { defaultStudioConfiguration } from "@ai-estimate-studio/domain";
import { evaluateStudioEstimate } from "@ai-estimate-studio/pricing-engine";
import { defaultStudioCatalog } from "./catalog";
import { createStudioEstimatePdf } from "./estimate-pdf";

describe("Mobup estimate PDF", () => {
  it("creates a readable one-page PDF with configuration metadata", async () => {
    const estimate = evaluateStudioEstimate({
      configuration: defaultStudioConfiguration,
      catalog: defaultStudioCatalog,
    });
    const bytes = await createStudioEstimatePdf({
      configuration: defaultStudioConfiguration,
      estimate,
      language: "fr",
      projectName: "Studio test",
    });
    const document = await PDFDocument.load(bytes);

    expect(bytes.slice(0, 5).toString()).toBe("37,80,68,70,45");
    expect(document.getPageCount()).toBe(1);
    expect(document.getSubject()).toContain("non contractuelle");
    expect(document.getKeywords()).toContain("P4");
    expect(document.getKeywords()).toContain("garden");
    expect(document.getKeywords()).toContain("M1");
    expect(document.getKeywords()).toContain("M8");
    expect(document.getKeywords()).toContain("CLAUSTRA");
  });
});
