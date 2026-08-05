import { describe, expect, it } from "vitest";
import {
  projectCategory,
  projectProduct,
  projectProductRevision,
} from "./projections";

const category = {
  id: "category-1" as never,
  organizationId: "org-1" as never,
  slug: "outdoor",
  name: { en: "Outdoor", fr: "Extérieur" },
  description: { en: "Outdoor products", fr: "Produits extérieur" },
  sortOrder: 0,
  state: "PUBLISHED" as const,
  version: 1 as never,
};

const product = {
  id: "product-1" as never,
  organizationId: "org-1" as never,
  categoryId: "category-1" as never,
  slug: "awning",
  state: "PUBLISHED" as const,
  version: 1 as never,
};

describe("published catalog projections", () => {
  it("uses requested locale, then fallback locale", () => {
    expect(projectCategory(category, "fr-FR", "en")).toMatchObject({
      name: "Extérieur",
    });
    expect(projectCategory(category, "de", "en")).toMatchObject({
      name: "Outdoor",
    });
  });

  it("never projects drafts or retired data", () => {
    expect(
      projectProduct(
        { ...product, state: "DRAFT" },
        { en: "Awning" },
        { en: "Summary" },
        "en",
        "en",
      ),
    ).toBeNull();
    expect(
      projectProductRevision(
        {
          id: "revision-1" as never,
          productId: "product-1" as never,
          revision: 1 as never,
          state: "RETIRED",
          name: { en: "Awning" },
          shortDescription: { en: "Summary" },
          description: { en: "Detail" },
          viewerSchemaVersion: 1,
          version: 1 as never,
        },
        "en",
        "en",
      ),
    ).toBeNull();
  });

  it("serializes starting money as integer minor-unit strings", () => {
    expect(
      projectProduct(product, { en: "Awning" }, { en: "Summary" }, "en", "en", {
        amountMinor: 12345n,
        currency: "EUR",
      }),
    ).toMatchObject({ startingPriceMinor: "12345", currency: "EUR" });
  });
});
