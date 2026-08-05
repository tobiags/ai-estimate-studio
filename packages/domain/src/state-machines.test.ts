import { describe, expect, it } from "vitest";
import {
  transitionAsset,
  transitionCatalog,
  transitionConfiguration,
  transitionJob,
  transitionQuote,
  transitionRecommendation,
} from "./state-machines.js";

describe("domain state machines", () => {
  it("allows only catalog lifecycle transitions", () => {
    expect(transitionCatalog("DRAFT", "PUBLISHED")).toBe("PUBLISHED");
    expect(transitionCatalog("PUBLISHED", "RETIRED")).toBe("RETIRED");
    expect(() => transitionCatalog("PUBLISHED", "DRAFT")).toThrow(
      "Invalid catalog transition",
    );
  });

  it("protects configuration and quote lifecycles", () => {
    expect(transitionConfiguration("ACTIVE", "QUOTED")).toBe("QUOTED");
    expect(transitionQuote("ISSUED", "VIEWED")).toBe("VIEWED");
    expect(transitionQuote("VIEWED", "CONTACTED")).toBe("CONTACTED");
    expect(() => transitionConfiguration("QUOTED", "ACTIVE")).toThrow(
      "Invalid configuration transition",
    );
    expect(() => transitionQuote("ACCEPTED", "REJECTED")).toThrow(
      "Invalid quote transition",
    );
  });

  it("covers asset, recommendation and async job transitions", () => {
    expect(transitionAsset("UPLOADING", "PROCESSING")).toBe("PROCESSING");
    expect(transitionAsset("PROCESSING", "READY")).toBe("READY");
    expect(transitionRecommendation("GENERATED", "VERIFIED")).toBe("VERIFIED");
    expect(transitionJob("PENDING", "RUNNING")).toBe("RUNNING");
    expect(transitionJob("RUNNING", "FAILED")).toBe("FAILED");
    expect(transitionJob("FAILED", "DEAD")).toBe("DEAD");
    expect(() => transitionAsset("READY", "PROCESSING")).toThrow(
      "Invalid asset transition",
    );
  });
});
