export type ConfigurationSelection = Readonly<{
  variantId: string;
  optionIds: readonly string[];
  dimensions: readonly Readonly<{
    definitionId: string;
    value: string;
    unit: string;
  }>[];
  budgetMinor?: string | null;
  locale: string;
}>;

export type AuthoritativeConfiguration = Readonly<{
  id: string;
  organizationId: string;
  productRevisionId: string;
  pricingRuleSetId: string;
  version: number;
  selection: ConfigurationSelection;
  price: Readonly<{
    totalMinor: string;
    currency: string;
    lines: readonly Readonly<Record<string, string>>[];
  }>;
  expiresAt: string;
}>;

export interface ConfigurationValidator {
  normalizeAndPrice(selection: ConfigurationSelection): Promise<
    Readonly<{
      selection: ConfigurationSelection;
      price: AuthoritativeConfiguration["price"];
    }>
  >;
}

export interface ConfigurationStore {
  create(
    scope: Readonly<{ organizationId: string }>,
    input: Readonly<{
      id: string;
      productRevisionId: string;
      pricingRuleSetId: string;
      selection: ConfigurationSelection;
      sessionTokenHash: string;
      expiresAt: string;
      price: AuthoritativeConfiguration["price"];
    }>,
  ): Promise<AuthoritativeConfiguration>;
  find(
    scope: Readonly<{ organizationId: string }>,
    id: string,
  ): Promise<AuthoritativeConfiguration | null>;
  update(
    scope: Readonly<{ organizationId: string }>,
    id: string,
    expectedVersion: number,
    input: Readonly<{
      selection: ConfigurationSelection;
      price: AuthoritativeConfiguration["price"];
    }>,
  ): Promise<AuthoritativeConfiguration>;
  sessionHash(
    scope: Readonly<{ organizationId: string }>,
    id: string,
  ): Promise<string | null>;
}

export interface ConfigurationClock {
  now(): string;
}
export interface ConfigurationIdGenerator {
  next(): string;
}
