import { describe, expect, it, vi } from "vitest";

import { createJobRunner } from "./runtime.js";

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
};

describe("job runner lifecycle", () => {
  it("rejects startup when required configuration is absent", () => {
    expect(() => createJobRunner({})).toThrow();
  });

  it("starts and stops idempotently", () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const runner = createJobRunner(validEnvironment, logger);

    runner.start();
    runner.start();
    expect(runner.isRunning()).toBe(true);

    runner.stop();
    runner.stop();
    expect(runner.isRunning()).toBe(false);
    expect(logger.info).toHaveBeenCalledTimes(2);
  });
});
