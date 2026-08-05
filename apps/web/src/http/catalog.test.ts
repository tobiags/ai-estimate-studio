import { describe, expect, it } from "vitest";
import {
  createCatalogHandlers,
  type CatalogRouteDependencies,
} from "./catalog";

function dependencies(): CatalogRouteDependencies {
  return {
    service: {
      async listCategories() {
        return {
          items: [
            {
              id: "category-a",
              slug: "doors",
              name: "Doors",
              description: "Catalog",
            },
          ],
          nextCursor: "next",
        };
      },
      async getCategory() {
        return {
          id: "category-a",
          slug: "doors",
          name: "Doors",
          description: "Catalog",
        };
      },
      async listProducts() {
        return {
          items: [
            {
              id: "product-a",
              slug: "door-a",
              name: "Door A",
              summary: "Door",
              startingPriceMinor: "1200",
              currency: "EUR",
            },
          ],
        };
      },
      async getProduct() {
        return {
          id: "product-a",
          slug: "door-a",
          name: "Door A",
          summary: "Door",
          startingPriceMinor: "1200",
          currency: "EUR",
        };
      },
    },
    resolveScope: async () => ({ organizationId: "org-a" }) as never,
  };
}

describe("public catalog HTTP handlers", () => {
  it("returns cacheable paginated category data and supports ETags", async () => {
    const handlers = createCatalogHandlers(dependencies());
    const request = new Request("https://example.test/categories?locale=fr");
    const first = await handlers.listCategories(request);
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toContain("s-maxage=60");
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const body = await first.json();
    expect(body.page).toEqual({ nextCursor: "next", hasMore: true });

    const replay = await handlers.listCategories(
      new Request("https://example.test/categories?locale=fr", {
        headers: { "if-none-match": etag! },
      }),
    );
    expect(replay.status).toBe(304);
  });

  it("returns 404 for missing published records and rejects invalid locales", async () => {
    const deps = dependencies();
    const handlers = createCatalogHandlers({
      ...deps,
      service: {
        ...deps.service,
        async getProduct() {
          return null;
        },
      },
    });
    expect(
      (
        await handlers.getProduct(
          new Request("https://example.test/products/door-a"),
          "door-a",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handlers.listProducts(
          new Request("https://example.test/products?locale=not-locale"),
        )
      ).status,
    ).toBe(422);
  });
});
