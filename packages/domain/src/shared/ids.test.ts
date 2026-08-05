import { describe, expect, it } from "vitest";
import { createId, isUuid, type ProductId } from "./ids.js";

describe("branded ids", () => {
  it("validates UUID syntax and preserves a nominal type", () => {
    const value = createId<ProductId>(
      "550e8400-e29b-41d4-a716-446655440000",
      "Product",
    );

    expect(value).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(isUuid(value)).toBe(true);
  });

  it("rejects empty, malformed and non-string ids", () => {
    expect(() => createId<ProductId>("", "Product")).toThrow(
      "Product id is required",
    );
    expect(() => createId<ProductId>("not-an-id", "Product")).toThrow(
      "Product id is invalid",
    );
    expect(() => createId<ProductId>(123 as never, "Product")).toThrow(
      "Product id is required",
    );
  });
});
