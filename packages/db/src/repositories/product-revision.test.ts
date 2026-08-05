import { describe, expect, it, vi } from "vitest";
import { PrismaProductRevisionAggregateRepository } from "./product-revision.js";

const organizationId = "00000000-0000-4000-8000-000000000001";
const revisionId = "00000000-0000-4000-8000-000000000002";
const productId = "00000000-0000-4000-8000-000000000003";
const variantId = "00000000-0000-4000-8000-000000000004";

function row() {
  return {
    id: revisionId,
    productId,
    revision: 1,
    state: "DRAFT" as const,
    name: { en: "Object" },
    shortDescription: { en: "Object" },
    description: { en: "Object" },
    assumptions: [],
    exclusions: [],
    defaultVariantId: variantId,
    viewerSchemaVersion: 1,
    publishedAt: null,
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
        baseAmountMinor: 1000n,
        currency: "EUR",
        sortOrder: 1,
      },
    ],
    optionGroups: [],
    dimensions: [],
    assets: [],
  };
}

function fakeClient() {
  const value = row();
  const client = {
    productRevision: {
      findFirst: vi.fn().mockResolvedValue(value),
      update: vi.fn().mockResolvedValue(value),
    },
    optionDependency: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    asset: { findMany: vi.fn().mockResolvedValue([]) },
    productAsset: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    dimensionDefinition: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    optionGroup: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    },
    productVariant: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (work: (transaction: typeof client) => unknown) =>
      work(client),
    ),
  };
  return client;
}

describe("PrismaProductRevisionAggregateRepository", () => {
  it("reads an organization-scoped normalized aggregate", async () => {
    const client = fakeClient();
    const repository = new PrismaProductRevisionAggregateRepository(
      client as never,
    );
    const aggregate = await repository.find(
      { organizationId } as never,
      revisionId,
    );
    expect(aggregate?.revision.id).toBe(revisionId);
    expect(aggregate?.variants[0]).toMatchObject({
      id: variantId,
      productRevisionId: revisionId,
      isDefault: true,
    });
    expect(client.productRevision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: revisionId, product: { organizationId } },
      }),
    );
  });

  it("replaces children in one optimistic transaction", async () => {
    const client = fakeClient();
    const repository = new PrismaProductRevisionAggregateRepository(
      client as never,
    );
    const aggregate = await repository.find(
      { organizationId } as never,
      revisionId,
    );
    await repository.saveDraft(
      { organizationId } as never,
      aggregate as never,
      1,
    );
    expect(client.$transaction).toHaveBeenCalledOnce();
    expect(client.productVariant.deleteMany).toHaveBeenCalledWith({
      where: { productRevisionId: revisionId },
    });
    expect(client.productVariant.create).toHaveBeenCalledOnce();
    expect(client.productRevision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: revisionId },
        data: expect.objectContaining({ version: 2 }),
      }),
    );
  });
});
