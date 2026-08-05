export type DomainErrorCode =
  | "DOMAIN_VALIDATION"
  | "NOT_FOUND"
  | "AUTHORIZATION_DENIED"
  | "INVALID_STATE_TRANSITION"
  | "VERSION_CONFLICT"
  | "DOMAIN_INVARIANT";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export class DomainValidationError extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super("DOMAIN_VALIDATION", message, details);
    this.name = "DomainValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", `${resource} ${id} was not found`, { resource, id });
    this.name = "NotFoundError";
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(machine: string, current: string, next: string) {
    super(
      "INVALID_STATE_TRANSITION",
      `Invalid ${machine} transition from ${current} to ${next}`,
      {
        machine,
        current,
        next,
      },
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class VersionConflictError extends DomainError {
  constructor(resource: string, expected: number, actual: number) {
    super(
      "VERSION_CONFLICT",
      `Version conflict for ${resource}: expected ${expected}, actual ${actual}`,
      {
        resource,
        expected,
        actual,
      },
    );
    this.name = "VersionConflictError";
  }
}

export class DomainInvariantError extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super("DOMAIN_INVARIANT", message, details);
    this.name = "DomainInvariantError";
  }
}
