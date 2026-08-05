import { describe, expect, it, vi } from "vitest";
import { PrismaPublicCatalogRepository } from "./public-catalog.js";

const organizationId = "00000000-0000-4000-8000-000000000001";
const categoryId = "00000000-0000-4000-8000-000000000002";
const productId = "00000000-0000-4000-8000-000000000003";
const revisionId = "00000000-0000-4000-8000-000000000004";
const variantId = "00000000-0000-4000-8000-000000000005";

function category(state: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
  return {
    id: categoryId,
    organizationId,
    slug: "roofs",
    name: { en: "Roofs" },
    description: { en: "Roof systems" },
    sortOrder: 1,
    state,
    version: 1,
  };
}

function product(state: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
  return {
    id: productId,
    organizationId,
    categoryId,
    slug: "roof-a",
    state,
    version: 1,
  };
}

function revision(state: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
  return {
    id: revisionId,
    productId,
    revision: 2,
    state,
    name: { en: "Roof A" },
    shortDescription: { en: "A roof" },
    description: { en: "A roof system" },
    assumptions: [],
    exclusions: [],
    defaultVariantId: variantId,
    viewerSchemaVersion: 1,
    publishedAt: new Date(),
    publishFrom: null,
    publishUntil: null,
    contentChecksum: "checksum",
    version: 1,
    variants: [
      {
        id: variantId,
        productRevisionId: revisionId,
        code: "BASE",
        name: { en: "Base" },
        description: { en: "Base" },
        baseAmountMinor: 125000n,
        currency: "EUR",
        sortOrder: 1,
      },
    ],
    optionGroups: [],
    dimensions: [],
    assets: [],
    defaultVariant: {
      id: variantId,
      productRevisionId: revisionId,
      code: "BASE",
      name: { en: "Base" },
      description: { en: "Base" },
      baseAmountMinor: 125000n,
      currency: "EUR",
      sortOrder: 1,
    },
  };
}

function fakeClient() {
  const client = {
    category: {
      findMany: vi.fn().mockResolvedValue([category()]),
      findFirst: vi.fn().mockResolvedValue(category()),
    },
    product: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ ...product(), revisions: [revision()] }]),
      findFirst: vi
        .fn()
        .mockResolvedValue({ ...product(), revisions: [revision()] }),
    },
  };
  return client;
}

describe("PrismaPublicCatalogRepository", () => {
  it("lists only published categories with organization and cursor bounds", async () => {
    const client = fakeClient();
    const repository = new PrismaPublicCatalogRepository(client as never);
    const result = await repository.listCategories(
      { organizationId } as never,
      { limit: 10 },
    );
    expect(result.items[0]?.slug).toBe("roofs");
    expect(client.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId, state: "PUBLISHED" },
        take: 11,
      }),
    );
  });

  it("selects the latest published revision and derives a bounded starting price", async () => {
    const client = fakeClient();
    const repository = new PrismaPublicCatalogRepository(client as never);
    const result = await repository.findProductBySlug(
      { organizationId } as never,
      "roof-a",
    );
    expect(result?.revision.revision).toBe(2);
    expect(result?.startingPrice).toEqual({
      amountMinor: 125000n,
      currency: "EUR",
    });
    expect(client.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          slug: "roof-a",
          state: "PUBLISHED",
        }),
      }),
    );
  });
});
