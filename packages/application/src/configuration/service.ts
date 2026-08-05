import { createHash, timingSafeEqual } from "node:crypto";
import type {
  ConfigurationSelection,
  ConfigurationStore,
  ConfigurationValidator,
  ConfigurationClock,
  ConfigurationIdGenerator,
  AuthoritativeConfiguration,
} from "./types.js";

export class ConfigurationApplicationError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "EXPIRED" | "UNAUTHORIZED" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ConfigurationApplicationError";
  }
}

export function hashConfigurationSession(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function matchesHash(expected: string, token: string): boolean {
  const actual = Buffer.from(hashConfigurationSession(token), "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export class ConfigurationApplicationService {
  constructor(
    private readonly store: ConfigurationStore,
    private readonly validator: ConfigurationValidator,
    private readonly clock: ConfigurationClock,
    private readonly ids: ConfigurationIdGenerator,
    private readonly ttlMs = 30 * 60 * 1000,
  ) {}

  async create(
    scope: Readonly<{ organizationId: string }>,
    input: Readonly<{
      productRevisionId: string;
      pricingRuleSetId: string;
      selection: ConfigurationSelection;
      sessionToken: string;
    }>,
  ): Promise<AuthoritativeConfiguration> {
    const normalized = await this.validator.normalizeAndPrice(input.selection);
    const expiresAt = new Date(
      Date.parse(this.clock.now()) + this.ttlMs,
    ).toISOString();
    return this.store.create(scope, {
      id: this.ids.next(),
      productRevisionId: input.productRevisionId,
      pricingRuleSetId: input.pricingRuleSetId,
      selection: normalized.selection,
      price: normalized.price,
      sessionTokenHash: hashConfigurationSession(input.sessionToken),
      expiresAt,
    });
  }

  async get(
    scope: Readonly<{ organizationId: string }>,
    id: string,
    sessionToken: string,
  ): Promise<AuthoritativeConfiguration> {
    const configuration = await this.store.find(scope, id);
    if (!configuration)
      throw new ConfigurationApplicationError(
        "NOT_FOUND",
        "Configuration not found",
      );
    if (Date.parse(configuration.expiresAt) <= Date.parse(this.clock.now()))
      throw new ConfigurationApplicationError(
        "EXPIRED",
        "Configuration session expired",
      );
    const expectedHash = await this.store.sessionHash(scope, id);
    if (!expectedHash || !matchesHash(expectedHash, sessionToken))
      throw new ConfigurationApplicationError(
        "UNAUTHORIZED",
        "Configuration session does not match",
      );
    return configuration;
  }

  async update(
    scope: Readonly<{ organizationId: string }>,
    id: string,
    sessionToken: string,
    expectedVersion: number,
    selection: ConfigurationSelection,
  ): Promise<AuthoritativeConfiguration> {
    await this.get(scope, id, sessionToken);
    const normalized = await this.validator.normalizeAndPrice(selection);
    return this.store.update(scope, id, expectedVersion, normalized);
  }
}
