import type {
  Category,
  Money,
  Page,
  PageRequest,
  Product,
  ProductRevision,
  OrganizationScope,
} from "@ai-estimate-studio/domain";
import {
  projectCategory,
  projectProduct,
  projectProductRevision,
  type PublicCategory,
  type PublicProduct,
  type PublicProductRevision,
} from "./projections.js";

export type PublicProductAggregate = Readonly<{
  product: Product;
  revision: ProductRevision;
  startingPrice?: Money;
}>;

export interface CatalogPublicRepository {
  listCategories(
    scope: OrganizationScope,
    page: PageRequest,
  ): Promise<Page<Category>>;
  findCategoryBySlug(
    scope: OrganizationScope,
    slug: string,
  ): Promise<Category | null>;
  listProducts(
    scope: OrganizationScope,
    page: PageRequest,
  ): Promise<Page<PublicProductAggregate>>;
  findProductBySlug(
    scope: OrganizationScope,
    slug: string,
  ): Promise<PublicProductAggregate | null>;
}

export type PublicCatalogPage<T> = Readonly<{
  items: readonly T[];
  nextCursor?: string;
}>;

export class CatalogPublicApplicationService {
  constructor(
    private readonly repository: CatalogPublicRepository,
    private readonly fallbackLocale: string,
  ) {}

  async listCategories(
    scope: OrganizationScope,
    input: Readonly<{ locale: string; page: PageRequest }>,
  ): Promise<PublicCatalogPage<PublicCategory>> {
    const page = await this.repository.listCategories(scope, input.page);
    return {
      items: page.items.flatMap((category) => {
        const projected = projectCategory(
          category,
          input.locale,
          this.fallbackLocale,
        );
        return projected ? [projected] : [];
      }),
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    };
  }

  async getCategory(
    scope: OrganizationScope,
    input: Readonly<{ slug: string; locale: string }>,
  ): Promise<PublicCategory | null> {
    const category = await this.repository.findCategoryBySlug(
      scope,
      input.slug,
    );
    return category
      ? projectCategory(category, input.locale, this.fallbackLocale)
      : null;
  }

  async listProducts(
    scope: OrganizationScope,
    input: Readonly<{ locale: string; page: PageRequest }>,
  ): Promise<PublicCatalogPage<PublicProduct>> {
    const page = await this.repository.listProducts(scope, input.page);
    return {
      items: page.items.flatMap((aggregate) => {
        const projected = projectProduct(
          aggregate.product,
          aggregate.revision.name,
          aggregate.revision.shortDescription,
          input.locale,
          this.fallbackLocale,
          aggregate.startingPrice,
        );
        return projected ? [projected] : [];
      }),
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    };
  }

  async getProduct(
    scope: OrganizationScope,
    input: Readonly<{ slug: string; locale: string }>,
  ): Promise<PublicProduct | null> {
    const aggregate = await this.repository.findProductBySlug(
      scope,
      input.slug,
    );
    return aggregate
      ? projectProduct(
          aggregate.product,
          aggregate.revision.name,
          aggregate.revision.shortDescription,
          input.locale,
          this.fallbackLocale,
          aggregate.startingPrice,
        )
      : null;
  }

  async getProductRevision(
    scope: OrganizationScope,
    input: Readonly<{ slug: string; locale: string }>,
  ): Promise<PublicProductRevision | null> {
    const aggregate = await this.repository.findProductBySlug(
      scope,
      input.slug,
    );
    return aggregate
      ? projectProductRevision(
          aggregate.revision,
          input.locale,
          this.fallbackLocale,
        )
      : null;
  }
}
