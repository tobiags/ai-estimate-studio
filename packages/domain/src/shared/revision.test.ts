import { describe, expect, it } from "vitest";
import {
  assertExpectedVersion,
  createRevision,
  createVersion,
  incrementVersion,
  nextRevision,
} from "./revision.js";

describe("revisions and optimistic versions", () => {
  it("accepts positive revisions and increments immutably", () => {
    const revision = createRevision(1);
    const next = nextRevision(revision);

    expect(revision).toBe(1);
    expect(next).toBe(2);
    expect(createVersion(1)).toBe(1);
    expect(incrementVersion(createVersion(1))).toBe(2);
  });

  it("rejects invalid values and reports version conflicts", () => {
    expect(() => createRevision(0)).toThrow(
      "Revision must be a positive integer",
    );
    expect(() => createVersion(0)).toThrow(
      "Version must be a positive integer",
    );
    expect(() =>
      assertExpectedVersion(createVersion(3), createVersion(2)),
    ).toThrow("Version conflict");
    expect(() =>
      assertExpectedVersion(createVersion(3), createVersion(3)),
    ).not.toThrow();
  });
});
