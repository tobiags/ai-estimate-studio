import { VersionConflictError, DomainValidationError } from "./errors.js";
import type { Brand } from "./ids.js";

export type Revision = Brand<number, "Revision">;
export type Version = Brand<number, "Version">;

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DomainValidationError(`${label} must be a positive integer`, {
      value,
    });
  }
  return value;
}

export function createRevision(value: number): Revision {
  return positiveInteger(value, "Revision") as Revision;
}

export function nextRevision(value: Revision): Revision {
  return createRevision(value + 1);
}

export function createVersion(value: number): Version {
  return positiveInteger(value, "Version") as Version;
}

export function incrementVersion(value: Version): Version {
  return createVersion(value + 1);
}

export function assertExpectedVersion(
  actual: Version,
  expected: Version,
  resource = "resource",
): void {
  if (actual !== expected) {
    throw new VersionConflictError(resource, expected, actual);
  }
}
