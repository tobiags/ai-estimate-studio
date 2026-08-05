import type { Prisma } from "@prisma/client";
import {
  createId,
  createLocalizedText,
  createRevision,
  createVersion,
  DomainInvariantError,
  type Category,
  type Product,
  type ProductRevision,
  type CategoryId,
  type ProductId,
  type ProductRevisionId,
  type LocalizedText,
} from "@ai-estimate-studio/domain";

function localized(value: Prisma.JsonValue, field: string): LocalizedText {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DomainInvariantError(`${field} must be a localized object`);
  }
  const entries = Object.entries(value);
  if (entries.some(([, text]) => typeof text !== "string")) {
    throw new DomainInvariantError(`${field} localized values must be strings`);
  }
  return createLocalizedText(
    Object.fromEntries(entries) as Record<string, string>,
  );
}

export function toLocalizedJson(
  value: Readonly<Record<string, string>>,
): Prisma.InputJsonObject {
  return { ...value };
}

export function mapCategory(
  row: Prisma.CategoryGetPayload<Prisma.CategoryDefaultArgs>,
): Category {
  return {
    id: createId<CategoryId>(row.id, "Category"),
    organizationId: createId(row.organizationId, "Organization"),
    slug: row.slug,
    name: localized(row.name, "Category.name"),
    description: localized(row.description, "Category.description"),
    sortOrder: row.sortOrder,
    state: row.state,
    version: createVersion(row.version),
  };
}

export function mapProduct(
  row: Prisma.ProductGetPayload<Prisma.ProductDefaultArgs>,
): Product {
  return {
    id: createId<ProductId>(row.id, "Product"),
    organizationId: createId(row.organizationId, "Organization"),
    categoryId: createId(row.categoryId, "Category"),
    slug: row.slug,
    state: row.state,
    version: createVersion(row.version),
  };
}

export function mapProductRevision(
  row: Prisma.ProductRevisionGetPayload<Prisma.ProductRevisionDefaultArgs>,
): ProductRevision {
  return {
    id: createId<ProductRevisionId>(row.id, "Product revision"),
    productId: createId(row.productId, "Product"),
    revision: createRevision(row.revision),
    state: row.state,
    name: localized(row.name, "ProductRevision.name"),
    shortDescription: localized(
      row.shortDescription,
      "ProductRevision.shortDescription",
    ),
    description: localized(row.description, "ProductRevision.description"),
    ...(row.defaultVariantId
      ? { defaultVariantId: createId(row.defaultVariantId, "Product variant") }
      : {}),
    viewerSchemaVersion: row.viewerSchemaVersion,
    version: createVersion(row.version),
  };
}
