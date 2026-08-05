import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createCurrencyCode,
  createId,
  createMoney,
  type Category,
  type Money,
  type OrganizationScope,
  type Page,
  type PageRequest,
} from "@ai-estimate-studio/domain";
import type {
  CatalogPublicRepository,
  PublicProductAggregate,
} from "@ai-estimate-studio/application";
import { prisma } from "../client.js";
import {
  mapCategory,
  mapProduct,
  mapProductRevision,
} from "../mappers/catalog.js";

type ProductRevisionRow = Prisma.ProductRevisionGetPayload<{
  include: {
    variants: true;
    defaultVariant: true;
  };
}>;

type ProductRow = Prisma.ProductGetPayload<{
  include: {
    revisions: {
      include: {
        variants: true;
        defaultVariant: true;
      };
    };
  };
}>;

function assertPage(page: PageRequest): void {
  if (!Number.isSafeInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new RangeError("Page limit must be an integer between 1 and 100");
  }
}

function startingPrice(row: ProductRevisionRow): Money | undefined {
  const variant = row.defaultVariant ?? row.variants.at(0);
  return variant
    ? createMoney(
        BigInt(variant.baseAmountMinor),
        createCurrencyCode(variant.currency),
      )
    : undefined;
}

function aggregate(
  row: ProductRow,
  revision: ProductRevisionRow,
): PublicProductAggregate {
  const price = startingPrice(revision);
  return {
    product: mapProduct(row),
    revision: mapProductRevision(revision),
    ...(price ? { startingPrice: price } : {}),
  };
}

function revisionInclude() {
  return {
    variants: true,
    defaultVariant: true,
  } as const;
}

export class PrismaPublicCatalogRepository implements CatalogPublicRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async listCategories(
    scope: OrganizationScope,
    page: PageRequest,
  ): Promise<Page<Category>> {
    assertPage(page);
    const cursor = page.cursor ? createId(page.cursor, "Category") : undefined;
    const rows = await this.client.category.findMany({
      where: { organizationId: scope.organizationId, state: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: page.limit + 1,
    });
    const hasNext = rows.length > page.limit;
    const items = (hasNext ? rows.slice(0, page.limit) : rows).map(mapCategory);
    const nextCursor = hasNext ? items.at(-1)?.id : undefined;
    return nextCursor ? { items, nextCursor } : { items };
  }

  async findCategoryBySlug(
    scope: OrganizationScope,
    slug: string,
  ): Promise<Category | null> {
    const row = await this.client.category.findFirst({
      where: { organizationId: scope.organizationId, slug, state: "PUBLISHED" },
    });
    return row ? mapCategory(row) : null;
  }

  async listProducts(
    scope: OrganizationScope,
    page: PageRequest,
  ): Promise<Page<PublicProductAggregate>> {
    assertPage(page);
    const cursor = page.cursor ? createId(page.cursor, "Product") : undefined;
    const rows = await this.client.product.findMany({
      where: {
        organizationId: scope.organizationId,
        state: "PUBLISHED",
        revisions: { some: { state: "PUBLISHED" } },
      },
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: page.limit + 1,
      include: {
        revisions: {
          where: { state: "PUBLISHED" },
          orderBy: { revision: "desc" },
          take: 1,
          include: revisionInclude(),
        },
      },
    });
    const hasNext = rows.length > page.limit;
    const selected = hasNext ? rows.slice(0, page.limit) : rows;
    const items = selected.flatMap((row) => {
      const revision = row.revisions[0];
      return revision ? [aggregate(row, revision)] : [];
    });
    const nextCursor = hasNext ? items.at(-1)?.product.id : undefined;
    return nextCursor ? { items, nextCursor } : { items };
  }

  async findProductBySlug(
    scope: OrganizationScope,
    slug: string,
  ): Promise<PublicProductAggregate | null> {
    const row = await this.client.product.findFirst({
      where: {
        organizationId: scope.organizationId,
        slug,
        state: "PUBLISHED",
        revisions: { some: { state: "PUBLISHED" } },
      },
      include: {
        revisions: {
          where: { state: "PUBLISHED" },
          orderBy: { revision: "desc" },
          take: 1,
          include: revisionInclude(),
        },
      },
    });
    const revision = row?.revisions[0];
    return row && revision ? aggregate(row, revision) : null;
  }
}
