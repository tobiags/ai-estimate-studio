import type {
  Category,
  Product,
  ProductRevision,
} from "@ai-estimate-studio/domain";
import { createLocale, resolveLocalizedText } from "@ai-estimate-studio/domain";
import type { PublicProductDetailSource } from "./public-service.js";

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

export type PublicProductDetail = PublicProduct &
  Readonly<{
    revisionId: string;
    description: string;
    variants: readonly Readonly<{
      id: string;
      code: string;
      name: string;
      description: string;
      basePrice: Readonly<{ amountMinor: string; currency: string }>;
    }>[];
    optionGroups: readonly Readonly<{
      id: string;
      code: string;
      name: string;
      mode: "SINGLE" | "MULTIPLE";
      minSelections: number;
      maxSelections: number | null;
      options: readonly Readonly<{
        id: string;
        code: string;
        name: string;
        description: string;
        viewerMappingKey?: string;
      }>[];
    }>[];
    dimensions: readonly Readonly<{
      id: string;
      code: string;
      label: string;
      unit: string;
      minValue: string;
      maxValue: string;
      stepValue: string;
      defaultValue: string | null;
    }>[];
    viewer?: Readonly<Record<string, unknown>>;
    assumptions: readonly string[];
    exclusions: readonly string[];
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

export function projectProductDetail(
  product: PublicProduct,
  revision: ProductRevision,
  detail: PublicProductDetailSource,
  locale: string,
  fallback: string,
): PublicProductDetail {
  const requested = createLocale(locale);
  const defaultLocale = createLocale(fallback);
  return {
    ...product,
    revisionId: revision.id,
    description: resolveLocalizedText(
      revision.description,
      requested,
      defaultLocale,
    ),
    variants: detail.variants.map((variant) => ({
      id: variant.id,
      code: variant.code,
      name: resolveLocalizedText(variant.name, requested, defaultLocale),
      description: resolveLocalizedText(
        variant.description,
        requested,
        defaultLocale,
      ),
      basePrice: {
        amountMinor: variant.basePrice.amountMinor.toString(),
        currency: variant.basePrice.currency,
      },
    })),
    optionGroups: detail.optionGroups.map((group) => ({
      id: group.id,
      code: group.code,
      name: resolveLocalizedText(group.name, requested, defaultLocale),
      mode: group.mode,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: group.options.map((option) => ({
        id: option.id,
        code: option.code,
        name: resolveLocalizedText(option.name, requested, defaultLocale),
        description: resolveLocalizedText(
          option.description,
          requested,
          defaultLocale,
        ),
        ...(option.viewerMappingKey
          ? { viewerMappingKey: option.viewerMappingKey }
          : {}),
      })),
    })),
    dimensions: detail.dimensions.map((dimension) => ({
      id: dimension.id,
      code: dimension.code,
      label: resolveLocalizedText(dimension.label, requested, defaultLocale),
      unit: dimension.unit,
      minValue: dimension.min,
      maxValue: dimension.max,
      stepValue: dimension.step,
      defaultValue: dimension.defaultValue ?? null,
    })),
    ...(detail.viewer ? { viewer: detail.viewer } : {}),
    assumptions: detail.assumptions.map((assumption) =>
      resolveLocalizedText(assumption, requested, defaultLocale),
    ),
    exclusions: detail.exclusions.map((exclusion) =>
      resolveLocalizedText(exclusion, requested, defaultLocale),
    ),
  };
}
