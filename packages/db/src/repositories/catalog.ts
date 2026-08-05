import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createId,
  DomainValidationError,
  NotFoundError,
  VersionConflictError,
  type CatalogRepository,
  type Category,
  type CategoryId,
  type CategoryUpdate,
  type NewCategory,
  type OrganizationScope,
  type Page,
  type PageRequest,
  type Product,
  type ProductId,
  type ProductRevision,
  type ProductRevisionId,
  type Version,
} from "@ai-estimate-studio/domain";
import { prisma } from "../client.js";
import {
  mapCategory,
  mapProduct,
  mapProductRevision,
  toLocalizedJson,
} from "../mappers/catalog.js";

function assertPage(page: PageRequest): void {
  if (!Number.isSafeInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new DomainValidationError(
      "Page limit must be an integer between 1 and 100",
    );
  }
}

function categoryInput(
  input: NewCategory | CategoryUpdate,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.name !== undefined) data.name = toLocalizedJson(input.name);
  if (input.description !== undefined)
    data.description = toLocalizedJson(input.description);
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  return data;
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findCategory(
    scope: OrganizationScope,
    id: CategoryId,
  ): Promise<Category | null> {
    const row = await this.client.category.findFirst({
      where: { id, organizationId: scope.organizationId },
    });
    return row ? mapCategory(row) : null;
  }

  async listCategories(
    scope: OrganizationScope,
    page: PageRequest,
  ): Promise<Page<Category>> {
    assertPage(page);
    const cursor = page.cursor
      ? createId<CategoryId>(page.cursor, "Category")
      : undefined;
    const rows = await this.client.category.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: page.limit + 1,
    });
    const hasNext = rows.length > page.limit;
    const items = (hasNext ? rows.slice(0, page.limit) : rows).map(mapCategory);
    const nextCursor = hasNext ? items.at(-1)?.id : undefined;
    return nextCursor ? { items, nextCursor } : { items };
  }

  async createCategory(
    scope: OrganizationScope,
    input: NewCategory,
  ): Promise<Category> {
    const data: Prisma.CategoryUncheckedCreateInput = {
      organizationId: scope.organizationId,
      slug: input.slug,
      name: toLocalizedJson(input.name),
      description: toLocalizedJson(input.description),
    };
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    const row = await this.client.category.create({
      data,
    });
    return mapCategory(row);
  }

  async updateCategory(
    scope: OrganizationScope,
    id: CategoryId,
    expectedVersion: Version,
    input: CategoryUpdate,
  ): Promise<Category> {
    const result = await this.client.category.updateMany({
      where: {
        id,
        organizationId: scope.organizationId,
        version: expectedVersion,
      },
      data: { ...categoryInput(input), version: expectedVersion + 1 },
    });
    if (result.count === 0) {
      const current = await this.client.category.findFirst({
        where: { id, organizationId: scope.organizationId },
        select: { version: true },
      });
      if (!current) throw new NotFoundError("Category", id);
      throw new VersionConflictError(
        "Category",
        expectedVersion,
        current.version,
      );
    }
    const updated = await this.findCategory(scope, id);
    if (!updated) throw new NotFoundError("Category", id);
    return updated;
  }

  async findProduct(
    scope: OrganizationScope,
    id: ProductId,
  ): Promise<Product | null> {
    const row = await this.client.product.findFirst({
      where: { id, organizationId: scope.organizationId },
    });
    return row ? mapProduct(row) : null;
  }

  async findRevision(
    scope: OrganizationScope,
    id: ProductRevisionId,
  ): Promise<ProductRevision | null> {
    const row = await this.client.productRevision.findFirst({
      where: { id, product: { organizationId: scope.organizationId } },
    });
    return row ? mapProductRevision(row) : null;
  }
}
