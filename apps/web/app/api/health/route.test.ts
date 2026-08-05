import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

const validEnvironment = {
  APP_ENV: "test",
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
  RELEASE_SHA: "abcdef1",
};

describe("GET /health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns only the documented health fields", async () => {
    for (const [name, value] of Object.entries(validEnvironment)) {
      vi.stubEnv(name, value);
    }

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      release: "abcdef1",
    });
  });

  it("fails closed when required runtime configuration is absent", () => {
    vi.stubEnv("APP_ENV", "");

    expect(() => GET()).toThrow();
  });
});
