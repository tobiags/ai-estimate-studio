import type {
  Category,
  Product,
  ProductRevision,
} from "@ai-estimate-studio/domain";
import { createLocale, resolveLocalizedText } from "@ai-estimate-studio/domain";

export type PublicCategory = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
}>;
export type PublicProduct = Readonly<{
  id: string;
  slug: string;
  name: string;
  summary: string;
  startingPriceMinor?: string;
  currency?: string;
}>;
export type PublicProductRevision = Readonly<{
  id: string;
  revision: number;
  name: string;
  shortDescription: string;
  description: string;
}>;

export function projectCategory(
  category: Category,
  locale: string,
  fallback: string,
): PublicCategory | null {
  if (category.state !== "PUBLISHED") return null;
  const requested = createLocale(locale);
  const defaultLocale = createLocale(fallback);
  return {
    id: category.id,
    slug: category.slug,
    name: resolveLocalizedText(category.name, requested, defaultLocale),
    description: resolveLocalizedText(
      category.description,
      requested,
      defaultLocale,
    ),
  };
}

export function projectProduct(
  product: Product,
  name: Record<string, string>,
  summary: Record<string, string>,
  locale: string,
  fallback: string,
  startingPrice?: Readonly<{ amountMinor: bigint; currency: string }>,
): PublicProduct | null {
  if (product.state !== "PUBLISHED") return null;
  const requested = createLocale(locale);
  const defaultLocale = createLocale(fallback);
  return {
    id: product.id,
    slug: product.slug,
    name: resolveLocalizedText(name, requested, defaultLocale),
    summary: resolveLocalizedText(summary, requested, defaultLocale),
    ...(startingPrice
      ? {
          startingPriceMinor: startingPrice.amountMinor.toString(),
          currency: startingPrice.currency,
        }
      : {}),
  };
}

export function projectProductRevision(
  revision: ProductRevision,
  locale: string,
  fallback: string,
): PublicProductRevision | null {
  if (revision.state !== "PUBLISHED") return null;
  const requested = createLocale(locale);
  const defaultLocale = createLocale(fallback);
  return {
    id: revision.id,
    revision: revision.revision,
    name: resolveLocalizedText(revision.name, requested, defaultLocale),
    shortDescription: resolveLocalizedText(
      revision.shortDescription,
      requested,
      defaultLocale,
    ),
    description: resolveLocalizedText(
      revision.description,
      requested,
      defaultLocale,
    ),
  };
}
