-- DOM-02 application/database invariants not expressible in schema.prisma.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_quoteValidityDays_positive" CHECK ("quoteValidityDays" > 0),
  ADD CONSTRAINT "Organization_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "Organization_currency_uppercase" CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_version_positive" CHECK ("version" > 0);

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_sortOrder_nonnegative" CHECK ("sortOrder" >= 0),
  ADD CONSTRAINT "Category_version_positive" CHECK ("version" > 0);

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_version_positive" CHECK ("version" > 0);

ALTER TABLE "ProductRevision"
  ADD CONSTRAINT "ProductRevision_revision_positive" CHECK ("revision" > 0),
  ADD CONSTRAINT "ProductRevision_viewerSchemaVersion_positive" CHECK ("viewerSchemaVersion" > 0),
  ADD CONSTRAINT "ProductRevision_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "ProductRevision_publication_window_ordered" CHECK (
    "publishFrom" IS NULL OR "publishUntil" IS NULL OR "publishFrom" < "publishUntil"
  );

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_currency_uppercase" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "ProductVariant_sortOrder_nonnegative" CHECK ("sortOrder" >= 0);

ALTER TABLE "OptionGroup"
  ADD CONSTRAINT "OptionGroup_selection_bounds" CHECK (
    "minSelections" >= 0 AND ("maxSelections" IS NULL OR "maxSelections" >= "minSelections")
  ),
  ADD CONSTRAINT "OptionGroup_single_maximum" CHECK ("mode" <> 'SINGLE' OR COALESCE("maxSelections", 1) <= 1);

ALTER TABLE "DimensionDefinition"
  ADD CONSTRAINT "DimensionDefinition_bounds" CHECK (
    "minValue" < "maxValue" AND "stepValue" > 0 AND ("defaultValue" IS NULL OR "defaultValue" BETWEEN "minValue" AND "maxValue")
  );

ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_bytes_nonnegative" CHECK ("bytes" >= 0),
  ADD CONSTRAINT "Asset_sha256_hex" CHECK ("sha256" ~ '^[0-9a-fA-F]{64}$');

CREATE UNIQUE INDEX "ProductAsset_primary_per_revision_role_key"
  ON "ProductAsset" ("productRevisionId", "role")
  WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "ProductRevision_one_published_key"
  ON "ProductRevision" ("productId")
  WHERE "state" = 'PUBLISHED';

CREATE UNIQUE INDEX "PricingRuleSet_one_published_key"
  ON "PricingRuleSet" ("productRevisionId")
  WHERE "state" = 'PUBLISHED';

ALTER TABLE "PricingRuleSet"
  ADD CONSTRAINT "PricingRuleSet_revision_positive" CHECK ("revision" > 0),
  ADD CONSTRAINT "PricingRuleSet_schemaVersion_positive" CHECK ("schemaVersion" > 0),
  ADD CONSTRAINT "PricingRuleSet_currency_uppercase" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "PricingRuleSet_effective_window_ordered" CHECK (
    "effectiveFrom" IS NULL OR "effectiveUntil" IS NULL OR "effectiveFrom" < "effectiveUntil"
  ),
  ADD CONSTRAINT "PricingRuleSet_version_positive" CHECK ("version" > 0);

ALTER TABLE "Configuration"
  ADD CONSTRAINT "Configuration_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "Configuration_budget_nonnegative" CHECK ("budgetMinor" IS NULL OR "budgetMinor" >= 0);

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_version_positive" CHECK ("version" > 0);

CREATE UNIQUE INDEX "Customer_organizationId_lower_email_key"
  ON "Customer" ("organizationId", lower("email"));

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_totals_consistent" CHECK ("subtotalMinor" + "discountMinor" + "taxMinor" = "totalMinor"),
  ADD CONSTRAINT "Quote_discount_nonpositive" CHECK ("discountMinor" <= 0),
  ADD CONSTRAINT "Quote_tax_nonnegative" CHECK ("taxMinor" >= 0),
  ADD CONSTRAINT "Quote_total_nonnegative" CHECK ("totalMinor" >= 0),
  ADD CONSTRAINT "Quote_currency_uppercase" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "Quote_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "Quote_expiry_after_issue" CHECK ("expiresAt" >= "issuedAt");

ALTER TABLE "QuoteLine"
  ADD CONSTRAINT "QuoteLine_sortOrder_nonnegative" CHECK ("sortOrder" >= 0),
  ADD CONSTRAINT "QuoteLine_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "QuoteLine_total_consistent" CHECK ("netAmountMinor" + "taxAmountMinor" = "totalAmountMinor");

ALTER TABLE "AsyncJob"
  ADD CONSTRAINT "AsyncJob_attempts_valid" CHECK ("attempts" >= 0 AND "maxAttempts" > 0 AND "attempts" <= "maxAttempts"),
  ADD CONSTRAINT "AsyncJob_version_positive" CHECK ("version" > 0);
