import { describe, expect, it } from "vitest";
import { buildAllowlistedContext, rankAlternatives } from "./builder";

const entities = [
  {
    entityType: "OPTION" as const,
    entityId: "option-2",
    revisionId: "revision-a",
    label: "Premium",
    deltaMinor: "500",
  },
  {
    entityType: "OPTION" as const,
    entityId: "option-1",
    revisionId: "revision-a",
    label: "Basic",
    deltaMinor: "200",
  },
  {
    entityType: "OPTION" as const,
    entityId: "other",
    revisionId: "revision-b",
    label: "Other",
    deltaMinor: "1",
  },
];

describe("allowlisted AI context", () => {
  it("isolates revisions and produces deterministic delimiters/checksum", () => {
    const first = buildAllowlistedContext({
      revisionId: "revision-a",
      locale: "en",
      entities,
      goal: "lower cost",
    });
    const second = buildAllowlistedContext({
      revisionId: "revision-a",
      locale: "en",
      entities: [...entities].reverse(),
      goal: "lower cost",
    });
    expect(first.entities).toHaveLength(2);
    expect(first.text).toContain("<catalog_context>");
    expect(first.text).toContain("<user_goal>");
    expect(first.checksum).toBe(second.checksum);
  });

  it("ranks bounded alternatives by verified delta and truncates candidates", () => {
    expect(
      rankAlternatives(entities, 400n, 1, "revision-a").map(
        (entity) => entity.entityId,
      ),
    ).toEqual(["option-1"]);
  });

  it("rejects PII in the goal", () => {
    expect(() =>
      buildAllowlistedContext({
        revisionId: "revision-a",
        locale: "en",
        entities,
        goal: "call me at ada@example.test",
      }),
    ).toThrow("contact");
  });
});
