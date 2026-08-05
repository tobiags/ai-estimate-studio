import { describe, expect, it, vi } from "vitest";
import {
  ProductRevisionApplicationError,
  ProductRevisionApplicationService,
  type ProductRevisionAggregate,
} from "./product-revision-service";

const revision = {
  id: "revision-1",
  productId: "product-1",
  revision: 1 as never,
  state: "DRAFT" as const,
  name: { en: "Object" },
  shortDescription: { en: "Object" },
  description: { en: "Object" },
  viewerSchemaVersion: 1,
  version: 3 as never,
};

function aggregate(): ProductRevisionAggregate {
  return {
    revision,
    variants: [
      {
        id: "variant-1",
        productRevisionId: "revision-1",
        code: "BASE",
        name: { en: "Base" },
        description: { en: "Base" },
        basePrice: { amountMinor: 1000n, currency: "EUR" as never },
        isDefault: true,
        sortOrder: 1,
      },
    ],
    optionGroups: [],
    dependencies: [],
    dimensions: [],
    assets: [],
  };
}

describe("ProductRevisionApplicationService", () => {
  it("saves a valid draft aggregate with the expected version", async () => {
    const repository = {
      find: vi.fn(),
      saveDraft: vi.fn(
        async (_scope: unknown, value: ProductRevisionAggregate) => value,
      ),
    };
    const service = new ProductRevisionApplicationService(repository);
    await expect(
      service.saveDraft({ organizationId: "org-1" }, aggregate(), 3),
    ).resolves.toEqual(aggregate());
    expect(repository.saveDraft).toHaveBeenCalledWith(
      { organizationId: "org-1" },
      aggregate(),
      3,
    );
  });

  it("rejects cross-revision references and stale versions before persistence", async () => {
    const repository = { find: vi.fn(), saveDraft: vi.fn() };
    const service = new ProductRevisionApplicationService(repository);
    const invalid = {
      ...aggregate(),
      variants: [{ ...aggregate().variants[0], productRevisionId: "other" }],
    } as ProductRevisionAggregate;
    await expect(
      service.saveDraft({ organizationId: "org-1" }, invalid, 3),
    ).rejects.toMatchObject({ code: "INVALID" });
    await expect(
      service.saveDraft({ organizationId: "org-1" }, aggregate(), 2),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repository.saveDraft).not.toHaveBeenCalled();
  });

  it("blocks published revisions without calling the repository", async () => {
    const repository = { find: vi.fn(), saveDraft: vi.fn() };
    const service = new ProductRevisionApplicationService(repository);
    const published = {
      ...aggregate(),
      revision: { ...revision, state: "PUBLISHED" as const },
    } as ProductRevisionAggregate;
    await expect(
      service.saveDraft({ organizationId: "org-1" }, published, 3),
    ).rejects.toBeInstanceOf(ProductRevisionApplicationError);
    await expect(
      service.saveDraft({ organizationId: "org-1" }, published, 3),
    ).rejects.toMatchObject({ code: "PUBLISHED_IMMUTABLE" });
    expect(repository.saveDraft).not.toHaveBeenCalled();
  });
});
