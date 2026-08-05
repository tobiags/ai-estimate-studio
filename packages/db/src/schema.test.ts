import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const schema = readFileSync(`${packageRoot}/prisma/schema.prisma`, "utf8");
const initialMigration = readFileSync(
  `${packageRoot}/prisma/migrations/0001_init/migration.sql`,
  "utf8",
);
const constraintsMigration = readFileSync(
  `${packageRoot}/prisma/migrations/0002_constraints/migration.sql`,
  "utf8",
);

describe("database design artifacts", () => {
  it("contains every normative aggregate and enum", () => {
    for (const name of [
      "Organization",
      "Membership",
      "Category",
      "ProductRevision",
      "ProductVariant",
      "OptionGroup",
      "ProductOption",
      "OptionDependency",
      "DimensionDefinition",
      "Asset",
      "ProductAsset",
      "Hotspot",
      "PricingRuleSet",
      "PricingRule",
      "Configuration",
      "Quote",
      "QuoteLine",
      "Customer",
      "ConsentRecord",
      "AIRecommendation",
      "AuditEvent",
      "AsyncJob",
    ]) {
      expect(schema).toContain(`model ${name}`);
    }
    expect(schema).toContain("enum OrganizationStatus");
    expect(schema).toContain("enum QuoteStatus");
    expect(schema).toContain("enum JobStatus");
  });

  it("stores generated DDL and database-only invariants as reviewable migrations", () => {
    expect(initialMigration).toContain('CREATE TABLE "Organization"');
    expect(initialMigration).toContain('CREATE TABLE "Quote"');
    expect(initialMigration).toContain('CREATE TABLE "AsyncJob"');
    expect(constraintsMigration).toContain(
      '"ProductRevision_one_published_key"',
    );
    expect(constraintsMigration).toContain('"Quote_totals_consistent"');
    expect(constraintsMigration).toContain(
      '"Customer_organizationId_lower_email_key"',
    );
  });
});
