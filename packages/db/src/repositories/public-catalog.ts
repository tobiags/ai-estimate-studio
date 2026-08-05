import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createCurrencyCode,
  createId,
  createLocalizedText,
  createMoney,
  DomainInvariantError,
  type Category,
  type LocalizedText,
  type Money,
  type OrganizationScope,
  type Page,
  type PageRequest,
} from "@ai-estimate-studio/domain";
import type {
  CatalogPublicRepository,
  PublicProductAggregate,
  PublicProductDetailSource,
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
    optionGroups: { include: { options: true } };
    dimensions: true;
    assets: { include: { asset: true; hotspots: true } };
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

function localized(value: Prisma.JsonValue, field: string): LocalizedText {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DomainInvariantError(`${field} must be a localized object`);
  }
  const entries = Object.entries(value);
  if (entries.some(([, item]) => typeof item !== "string")) {
    throw new DomainInvariantError(`${field} localized values must be strings`);
  }
  return createLocalizedText(
    Object.fromEntries(entries) as Record<string, string>,
  );
}

function localizedList(
  value: Prisma.JsonValue,
  field: string,
): readonly LocalizedText[] {
  if (!Array.isArray(value)) {
    throw new DomainInvariantError(`${field} must be a localized list`);
  }
  return value.map((item, index) =>
    typeof item === "string"
      ? createLocalizedText({ en: item })
      : localized(item, `${field}[${index}]`),
  );
}

function record(
  value: Prisma.JsonValue,
  field: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DomainInvariantError(`${field} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function detail(row: ProductRevisionRow): PublicProductDetailSource {
  const readyAssets = row.assets.filter(
    (usage) => usage.asset.status === "READY",
  );
  const viewerAssets = readyAssets.map((usage) => ({
    id: usage.assetId,
    role: usage.role,
    ...(usage.viewerManifest === null
      ? {}
      : {
          manifest: record(usage.viewerManifest, "ProductAsset.viewerManifest"),
        }),
    hotspots: usage.hotspots.map((hotspot) => ({
      id: hotspot.id,
      nodeId: hotspot.nodeKey,
      position: hotspot.position,
      normal: hotspot.normal,
      label: localized(hotspot.label, "Hotspot.label"),
      detail: localized(hotspot.detail, "Hotspot.detail"),
    })),
  }));
  return {
    variants: row.variants.map((variant) => ({
      id: variant.id,
      code: variant.code,
      name: localized(variant.name, "ProductVariant.name"),
      description: localized(variant.description, "ProductVariant.description"),
      basePrice: createMoney(
        BigInt(variant.baseAmountMinor),
        createCurrencyCode(variant.currency),
      ),
    })),
    optionGroups: row.optionGroups.map((group) => ({
      id: group.id,
      code: group.code,
      name: localized(group.name, "OptionGroup.name"),
      description: localized(group.description, "OptionGroup.description"),
      mode: group.mode,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: group.options.map((option) => ({
        id: option.id,
        code: option.code,
        name: localized(option.name, "ProductOption.name"),
        description: localized(option.description, "ProductOption.description"),
        ...(option.viewerMappingKey
          ? { viewerMappingKey: option.viewerMappingKey }
          : {}),
      })),
    })),
    dimensions: row.dimensions.map((dimension) => ({
      id: dimension.id,
      code: dimension.code,
      label: localized(dimension.label, "DimensionDefinition.label"),
      unit: dimension.unit,
      min: dimension.minValue.toString(),
      max: dimension.maxValue.toString(),
      step: dimension.stepValue.toString(),
      ...(dimension.defaultValue === null
        ? {}
        : { defaultValue: dimension.defaultValue.toString() }),
    })),
    assumptions: localizedList(row.assumptions, "ProductRevision.assumptions"),
    exclusions: localizedList(row.exclusions, "ProductRevision.exclusions"),
    ...(viewerAssets.length > 0 ? { viewer: { assets: viewerAssets } } : {}),
  };
}

function aggregate(
  row: ProductRow,
  revision: ProductRevisionRow,
): PublicProductAggregate {
  const price = startingPrice(revision);
  return {
    product: mapProduct(row),
    revision: mapProductRevision(revision),
    detail: detail(revision),
    ...(price ? { startingPrice: price } : {}),
  };
}

function revisionInclude() {
  return {
    variants: true,
    defaultVariant: true,
    optionGroups: { include: { options: true } },
    dimensions: true,
    assets: { include: { asset: true, hotspots: true } },
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
