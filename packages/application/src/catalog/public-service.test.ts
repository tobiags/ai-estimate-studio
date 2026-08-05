import { describe, expect, it } from "vitest";
import {
  CatalogPublicApplicationService,
  type CatalogPublicRepository,
} from "./public-service.js";

const category = {
  id: "category-a",
  organizationId: "org-a",
  slug: "doors",
  name: { en: "Doors", fr: "Portes" },
  description: { en: "Door catalog" },
  sortOrder: 1,
  state: "PUBLISHED" as const,
  version: 1 as never,
};

const product = {
  id: "product-a",
  organizationId: "org-a",
  categoryId: "category-a",
  slug: "door-a",
  state: "PUBLISHED" as const,
  version: 1 as never,
};

const revision = {
  id: "revision-a",
  productId: "product-a",
  revision: 1 as never,
  state: "PUBLISHED" as const,
  name: { en: "Door A", fr: "Porte A" },
  shortDescription: { en: "A door" },
  description: { en: "A published door" },
  viewerSchemaVersion: 1,
  version: 1 as never,
};

describe("CatalogPublicApplicationService", () => {
  it("projects only published data with locale fallback and cursor preservation", async () => {
    const repository: CatalogPublicRepository = {
      async listCategories() {
        return { items: [category], nextCursor: "next-category" };
      },
      async findCategoryBySlug() {
        return category;
      },
      async listProducts() {
        return {
          items: [
            {
              product,
              revision,
              startingPrice: { amountMinor: 1200n, currency: "EUR" as never },
            },
          ],
        };
      },
      async findProductBySlug() {
        return {
          product,
          revision,
          startingPrice: { amountMinor: 1200n, currency: "EUR" as never },
        };
      },
    };
    const service = new CatalogPublicApplicationService(repository, "en");
    await expect(
      service.listCategories({ organizationId: "org-a" } as never, {
        locale: "fr",
        page: { limit: 20 },
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "category-a",
          slug: "doors",
          name: "Portes",
          description: "Door catalog",
        },
      ],
      nextCursor: "next-category",
    });
    await expect(
      service.listProducts({ organizationId: "org-a" } as never, {
        locale: "fr",
        page: { limit: 20 },
      }),
    ).resolves.toMatchObject({
      items: [
        {
          slug: "door-a",
          name: "Porte A",
          startingPriceMinor: "1200",
          currency: "EUR",
        },
      ],
    });
  });

  it("hides drafts from direct product reads", async () => {
    const repository: CatalogPublicRepository = {
      async listCategories() {
        return { items: [] };
      },
      async findCategoryBySlug() {
        return null;
      },
      async listProducts() {
        return { items: [] };
      },
      async findProductBySlug() {
        return {
          product: { ...product, state: "DRAFT" as const },
          revision,
        };
      },
    };
    await expect(
      new CatalogPublicApplicationService(repository, "en").getProduct(
        { organizationId: "org-a" } as never,
        { slug: "door-a", locale: "en" },
      ),
    ).resolves.toBeNull();
  });

  it("projects a complete product detail when the repository supplies the aggregate children", async () => {
    const repository: CatalogPublicRepository = {
      async listCategories() {
        return { items: [] };
      },
      async findCategoryBySlug() {
        return null;
      },
      async listProducts() {
        return { items: [] };
      },
      async findProductBySlug() {
        return {
          product,
          revision,
          detail: {
            variants: [
              {
                id: "variant-a",
                code: "BASE",
                name: { en: "Base", fr: "Base FR" },
                description: { en: "Base variant" },
                basePrice: { amountMinor: 1200n, currency: "EUR" as never },
              },
            ],
            optionGroups: [],
            dimensions: [],
            assumptions: [{ en: "Measured on site" }],
            exclusions: [{ en: "Electrical work" }],
            viewer: { schemaVersion: 1 },
          },
        };
      },
    };
    await expect(
      new CatalogPublicApplicationService(repository, "en").getProduct(
        { organizationId: "org-a" } as never,
        { slug: "door-a", locale: "fr" },
      ),
    ).resolves.toMatchObject({
      revisionId: "revision-a",
      description: "A published door",
      variants: [{ basePrice: { amountMinor: "1200", currency: "EUR" } }],
      assumptions: ["Measured on site"],
      exclusions: ["Electrical work"],
      viewer: { schemaVersion: 1 },
    });
  });
});
