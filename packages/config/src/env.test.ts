import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "./env.js";

const validServerEnv = {
  APP_ENV: "development",
  DATABASE_URL:
    "postgresql://postgres:postgres@localhost:5432/ai_estimate_studio",
  DIRECT_DATABASE_URL:
    "postgresql://postgres:postgres@localhost:5432/ai_estimate_studio",
  OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
  OBJECT_STORAGE_REGION: "us-east-1",
  OBJECT_STORAGE_BUCKET: "ai-estimate-studio",
  OBJECT_STORAGE_ACCESS_KEY: "minioadmin",
  OBJECT_STORAGE_SECRET_KEY: "minioadmin",
  AI_PROVIDER: "fake",
  EMAIL_PROVIDER: "fake",
};

describe("parseServerEnv", () => {
  it("accepts a complete local-development environment", () => {
    expect(parseServerEnv(validServerEnv)).toMatchObject({
      APP_ENV: "development",
      AI_PROVIDER: "fake",
    });
  });

  it("rejects a missing database URL", () => {
    const { DATABASE_URL: _omitted, ...invalidEnv } = validServerEnv;

    expect(() => parseServerEnv(invalidEnv)).toThrow();
  });

  it("rejects fake providers in production", () => {
    expect(() =>
      parseServerEnv({ ...validServerEnv, APP_ENV: "production" }),
    ).toThrow(/fake providers/i);
  });
});

describe("parsePublicEnv", () => {
  it("accepts an absolute application URL", () => {
    expect(
      parsePublicEnv({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }),
    ).toEqual({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" });
  });

  it("rejects a relative application URL", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "/app" })).toThrow();
  });
});
