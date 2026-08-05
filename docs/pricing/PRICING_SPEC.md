# Pricing Engine Specification

**Status:** Proposed normative specification  
**Authority:** Only a server evaluation by the versioned pricing engine may issue a quote.

## 1. Design goals

- Deterministic, explainable and testable calculations.
- No executable JavaScript, templates, AI calls, database calls or implicit current time inside rules.
- Same engine and rule schema for every product category.
- Exact minor-unit arithmetic with explicit rounding and ordered line items.
- Publication validation prevents ambiguous stacking, cycles and invalid references.

## 2. Evaluation input and output

### Input

`schemaVersion`, `evaluationTimestamp`, organization/currency/tax mode, pinned product and pricing revisions, variant, selected option IDs, normalized dimensions, delivery facts, customer tax facts, optional promotion code and budget.

### Output

Ordered line items, subtotal before discounts, discounts, taxable bases by tax class, taxes, total, currency, warnings, validation violations, applied/skipped rule trace, rule-set revision and deterministic checksum.

## 3. Calculation stages

1. Validate revision, currency, dimensions, option cardinality, dependencies and input fact allowlist.
2. Add exactly one variant `BASE` line.
3. Evaluate `OPTION` and `DIMENSION` adjustments by priority.
4. Evaluate `LABOUR` and non-tax `FEE` rules.
5. Evaluate one matching `DELIVERY` zone/rule, or explicit zero-delivery policy.
6. Evaluate eligible `DISCOUNT` rules according to stack groups/caps.
7. Build taxable base per line tax class and evaluate `TAX` rules.
8. Sum and validate totals; emit stable sorted trace/checksum.

No stage can read a future-stage amount. Taxes cannot be discounted unless the jurisdiction rule explicitly defines discount allocation before taxable-base construction.

## 4. Money, quantity and rounding

- Amounts are integer minor units. Quantities/rates are bounded decimals with maximum scale 6.
- Multiplication produces a rational/decimal intermediate and rounds once when creating a line.
- Rounding mode is half away from zero at the currency minor-unit scale.
- Percentage rates use integer basis points (`10000 = 100%`).
- Percentage adjustment formula is `round(eligibleMinor × basisPoints / 10000)`.
- Taxes round per tax class on the aggregate taxable base unless organization tax policy explicitly requires per-line rounding; the chosen policy is stored in the rule-set snapshot.
- Negative totals are invalid; discounts are capped so total before tax never falls below zero.

## 5. Rule schema

Each rule has stable `code`, `kind`, `priority`, localized label, condition tree, action, optional stack group/exclusivity, tax class and source metadata.

### Condition language

Allowed nodes are `all`, `any`, `not`, `eq`, `neq`, `in`, `gte`, `lte`, `between`, `selected`, `variantIs`, `dimension` and `fact`. Operands reference only typed allowlisted paths. Conditions cannot loop, recurse beyond depth 10 or contain more than 100 nodes.

Example:

```json
{
  "all": [
    { "variantIs": "variant-large" },
    { "selected": "option-heated" },
    { "dimension": { "code": "length", "gte": "6.0" } }
  ]
}
```

### Actions

- `fixedAmount`: add an exact minor-unit line.
- `perUnit`: multiply normalized dimension/fact by minor-unit rate.
- `percentage`: apply basis points to an explicitly named eligible line-kind/tax-class set.
- `tiered`: select exactly one non-overlapping numeric tier.
- `formula`: limited expression AST using `add`, `subtract`, `multiply`, `min`, `max` and allowlisted numeric facts; division is permitted only by a non-zero constant.
- `reject`: return a validation violation for an invalid priced combination.

Actions cannot mutate facts or select options.

## 6. Pricing domains

### Base and options

Every published variant defines a base price in the rule-set currency. Options are priced only through rules, allowing fixed, dimensional or bundled adjustments. Required included options may generate zero lines for transparency.

### Labour

Labor rules use fixed, per-unit or tiered quantities and a `LABOUR` line kind. Labor quantity/unit is shown. Minimum callout amounts are explicit rules, not hidden clamps.

### Delivery

Delivery facts are normalized postal/country/zone identifiers supplied by a server resolver. A published product defines permitted zones and exactly one matching delivery outcome. Unsupported areas return a blocking violation; external map API price calls are excluded from deterministic quote issue.

### Discounts

Discounts require effective dates and eligibility. A stack group declares `EXCLUSIVE_HIGHEST`, `EXCLUSIVE_FIRST`, or `STACKABLE`; ambiguity rejects publication. Percentage discounts declare eligible line kinds and maximum minor amount. Promotion codes are stored hashed where sensitive and never returned in catalog payloads.

### Taxes

Tax rules declare jurisdiction key, tax class, basis points, inclusive/exclusive mode, effective interval and rounding policy. Inclusive tax extracts tax as `round(gross × rate / (10000 + rate))`; exclusive tax adds `round(net × rate / 10000)`. The organization owns correctness and legal review.

## 7. Dependencies and validation

- Option dependencies are evaluated before pricing. `REQUIRES` and `EXCLUDES` graph references must remain inside one product revision.
- Dependency cycles, impossible required groups, duplicate priorities with conflicting stack semantics, overlapping tiers/effective intervals, unknown facts/entity IDs, currency mismatch and unbounded formulas block publication.
- Numeric limits: absolute line/total ≤ 9×10^15 minor units, quantity ≤ 10^9, basis points between -10000 and 100000 unless a documented tax exception is approved.
- A rule set must contain a valid default scenario and a test matrix covering each rule’s true/false boundary.

## 8. Trace and explainability

For every rule, trace records rule code/revision, evaluated condition result, selected operands (non-PII), action result, created line ID or safe skip reason. Trace order is priority then rule code. Public APIs expose line source labels and warnings, not sensitive promotion conditions or full admin traces.

## 9. Required test matrix

- Golden scenarios for each of four initial categories.
- Boundary values immediately below/at/above every dimension tier and effective timestamp.
- Pairwise option combinations plus exhaustive combinations for groups ≤10 binary options.
- Dependency cycle/property tests and rule AST fuzz tests.
- Rounding tests for positive/negative half-minor boundaries, inclusive/exclusive tax, discount allocation and maximum amounts.
- Determinism test across repeated randomized input ordering and timezones.
- Mutation/decision coverage: every condition branch and action kind must fail at least one deliberately changed implementation.

## 10. Publication completion criteria

A rule-set revision is publishable only when schema validation, reference validation, dependency graph validation, static formula bounds, effective interval checks, default scenario, admin simulation suite and checksum generation pass. Publication creates an immutable revision and audit event; cache invalidation follows transaction commit.
