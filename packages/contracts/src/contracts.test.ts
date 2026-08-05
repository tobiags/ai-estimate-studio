import { describe, expect, it } from "vitest";
import {
  createConfigurationRequestSchema,
  healthSchema,
  paginationQuerySchema,
  problemSchema,
} from "./index";

describe("runtime API contracts", () => {
  it("validates the documented health response", () => {
    expect(healthSchema.parse({ status: "ok", release: "abc" })).toEqual({
      status: "ok",
      release: "abc",
    });
    expect(() =>
      healthSchema.parse({ status: "degraded", release: "abc" }),
    ).toThrow();
  });

  it("coerces bounded pagination query values", () => {
    expect(paginationQuerySchema.parse({ limit: "10" })).toEqual({ limit: 10 });
    expect(() => paginationQuerySchema.parse({ limit: "101" })).toThrow();
  });

  it("rejects duplicate options and unknown request fields", () => {
    const request = {
      productSlug: "kitchen",
      locale: "en",
      optionIds: [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000001",
      ],
      unsafe: true,
    };
    expect(() => createConfigurationRequestSchema.parse(request)).toThrow();
  });

  it("accepts RFC 7807 problems with correlation ids", () => {
    expect(
      problemSchema.parse({
        type: "https://ai-estimate-studio.dev/problems/conflict",
        title: "Conflict",
        status: 409,
        correlationId: "corr-1",
      }).status,
    ).toBe(409);
  });
});
