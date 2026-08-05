import { createHash } from "node:crypto";
import type {
  CatalogPublicApplicationService,
  PublicCatalogPage,
} from "@ai-estimate-studio/application";
import type { OrganizationScope } from "@ai-estimate-studio/domain";
import { localeSchema, slugSchema } from "@ai-estimate-studio/contracts";
import { parsePagination } from "./pagination";
import { problemResponse } from "./problems";
import { safeRoute } from "./route";

type Scope = OrganizationScope;
type CatalogService = Pick<
  CatalogPublicApplicationService,
  "listCategories" | "getCategory" | "listProducts" | "getProduct"
>;

export type CatalogRouteDependencies = Readonly<{
  service: CatalogService;
  resolveScope(request: Request): Promise<Scope>;
  fallbackLocale?: string;
}>;

function locale(request: Request, fallback: string): string | Response {
  const value = new URL(request.url).searchParams.get("locale") ?? fallback;
  const parsed = localeSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : problemResponse({ title: "Invalid locale", status: 422 });
}

function cachedResponse(
  request: Request,
  body: unknown,
  maxAgeSeconds = 60,
): Response {
  const serialized = JSON.stringify(body);
  const etag = `"${createHash("sha256").update(serialized).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(serialized, {
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=0, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`,
      ETag: etag,
    },
  });
}

function pageBody<T>(page: PublicCatalogPage<T>) {
  return {
    data: page.items,
    page: {
      nextCursor: page.nextCursor ?? null,
      hasMore: page.nextCursor !== undefined,
    },
  };
}

function pageRequest(request: Request) {
  const parsed = parsePagination(request);
  return {
    limit: parsed.limit,
    ...(parsed.cursor === undefined ? {} : { cursor: parsed.cursor }),
  };
}

export function createCatalogHandlers(dependencies: CatalogRouteDependencies) {
  const fallbackLocale = dependencies.fallbackLocale ?? "en";
  return {
    listCategories: (request: Request) =>
      safeRoute(async () => {
        const selectedLocale = locale(request, fallbackLocale);
        if (selectedLocale instanceof Response) return selectedLocale;
        const page = await dependencies.service.listCategories(
          await dependencies.resolveScope(request),
          { locale: selectedLocale, page: pageRequest(request) },
        );
        return cachedResponse(request, pageBody(page));
      }),
    getCategory: (request: Request, slug: string) =>
      safeRoute(async () => {
        if (!slugSchema.safeParse(slug).success)
          return problemResponse({
            title: "Invalid category slug",
            status: 422,
          });
        const selectedLocale = locale(request, fallbackLocale);
        if (selectedLocale instanceof Response) return selectedLocale;
        const category = await dependencies.service.getCategory(
          await dependencies.resolveScope(request),
          { slug, locale: selectedLocale },
        );
        return category
          ? cachedResponse(request, category)
          : problemResponse({ title: "Category not found", status: 404 });
      }),
    listProducts: (request: Request) =>
      safeRoute(async () => {
        const selectedLocale = locale(request, fallbackLocale);
        if (selectedLocale instanceof Response) return selectedLocale;
        const page = await dependencies.service.listProducts(
          await dependencies.resolveScope(request),
          { locale: selectedLocale, page: pageRequest(request) },
        );
        return cachedResponse(request, pageBody(page));
      }),
    getProduct: (request: Request, slug: string) =>
      safeRoute(async () => {
        if (!slugSchema.safeParse(slug).success)
          return problemResponse({
            title: "Invalid product slug",
            status: 422,
          });
        const selectedLocale = locale(request, fallbackLocale);
        if (selectedLocale instanceof Response) return selectedLocale;
        const product = await dependencies.service.getProduct(
          await dependencies.resolveScope(request),
          { slug, locale: selectedLocale },
        );
        return product
          ? cachedResponse(request, product)
          : problemResponse({ title: "Product not found", status: 404 });
      }),
  };
}
