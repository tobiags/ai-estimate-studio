import {
  recommendationOutputSchema,
  type RecommendationOutput,
} from "../schemas.js";
import { AiPolicyError, RecommendationVerificationError } from "../errors.js";
import type { ContextEntity } from "../context/builder.js";

export type RecomputedRecommendationPrice = Readonly<{
  valid: boolean;
  deltaMinor: string;
  currency: string;
  reason?: string;
}>;

export type RecommendationRecalculator = (
  input: Readonly<{
    addOptionIds: readonly string[];
    removeOptionIds: readonly string[];
  }>,
) => Promise<RecomputedRecommendationPrice>;

export type RecommendationVerificationIssue = Readonly<{
  index: number;
  code: RecommendationVerificationError["code"];
  message: string;
}>;

export type RecommendationVerificationResult = Readonly<{
  status: "VERIFIED" | "PARTIAL" | "REJECTED";
  output: Readonly<
    Omit<RecommendationOutput, "suggestions"> & {
      suggestions: readonly Suggestion[];
    }
  >;
  issues: readonly RecommendationVerificationIssue[];
}>;

type Suggestion = RecommendationOutput["suggestions"][number];

function sameMinor(left: string, right: string): boolean {
  try {
    return BigInt(left) === BigInt(right);
  } catch {
    return false;
  }
}

function issue(
  index: number,
  error: RecommendationVerificationError,
): RecommendationVerificationIssue {
  return { index, code: error.code, message: error.message };
}

function checkSuggestion(
  suggestion: Suggestion,
  index: number,
  entities: readonly ContextEntity[],
): RecommendationVerificationError | null {
  const byId = new Map(
    entities.map((entity) => [
      `${entity.entityType}:${entity.entityId}`,
      entity,
    ]),
  );
  const add = new Set(suggestion.addOptionIds);
  const remove = new Set(suggestion.removeOptionIds);
  if (
    add.size !== suggestion.addOptionIds.length ||
    remove.size !== suggestion.removeOptionIds.length ||
    [...add].some((id) => remove.has(id))
  )
    return new RecommendationVerificationError(
      "INVALID_COMBINATION",
      `Suggestion ${index} contains duplicate or overlapping option IDs`,
    );
  for (const id of [...add, ...remove]) {
    if (!byId.has(`OPTION:${id}`))
      return new RecommendationVerificationError(
        "UNKNOWN_ENTITY",
        `Suggestion ${index} references an unavailable option: ${id}`,
      );
  }
  for (const citation of suggestion.citations) {
    if (!byId.has(`${citation.entityType}:${citation.entityId}`))
      return new RecommendationVerificationError(
        "CITATION_UNKNOWN",
        `Suggestion ${index} cites an unavailable entity: ${citation.entityId}`,
      );
  }
  return null;
}

/** Recomputes every proposed change and drops anything not authoritatively verified. */
export async function verifyRecommendation(
  raw: unknown,
  entities: readonly ContextEntity[],
  recalculate: RecommendationRecalculator,
): Promise<RecommendationVerificationResult> {
  let output: RecommendationOutput;
  try {
    output = recommendationOutputSchema.parse(raw);
  } catch {
    throw new AiPolicyError(
      "SCHEMA_INVALID",
      "AI recommendation output failed schema validation",
    );
  }
  const issues: RecommendationVerificationIssue[] = [];
  const verified: Suggestion[] = [];
  for (const [index, suggestion] of output.suggestions.entries()) {
    const structuralIssue = checkSuggestion(suggestion, index, entities);
    if (structuralIssue) {
      issues.push(issue(index, structuralIssue));
      continue;
    }
    const recomputed = await recalculate({
      addOptionIds: suggestion.addOptionIds,
      removeOptionIds: suggestion.removeOptionIds,
    });
    if (!recomputed.valid) {
      issues.push(
        issue(
          index,
          new RecommendationVerificationError(
            "INVALID_COMBINATION",
            recomputed.reason ??
              `Suggestion ${index} is not a valid configuration`,
          ),
        ),
      );
      continue;
    }
    if (!sameMinor(suggestion.verifiedDeltaMinor, recomputed.deltaMinor)) {
      issues.push(
        issue(
          index,
          new RecommendationVerificationError(
            "DELTA_MISMATCH",
            `Suggestion ${index} delta does not match authoritative pricing`,
          ),
        ),
      );
      continue;
    }
    if (suggestion.currency !== recomputed.currency) {
      issues.push(
        issue(
          index,
          new RecommendationVerificationError(
            "CURRENCY_MISMATCH",
            `Suggestion ${index} currency does not match authoritative pricing`,
          ),
        ),
      );
      continue;
    }
    verified.push(suggestion);
  }
  const status =
    verified.length === output.suggestions.length
      ? "VERIFIED"
      : verified.length > 0
        ? "PARTIAL"
        : "REJECTED";
  return Object.freeze({
    status,
    output: Object.freeze({ ...output, suggestions: Object.freeze(verified) }),
    issues: Object.freeze(issues),
  });
}
