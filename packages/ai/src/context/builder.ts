import { assertSafeAiInput, defaultAiPolicy } from "../policy.js";

export type ContextEntity = Readonly<{
  entityType: "VARIANT" | "OPTION" | "DIMENSION" | "PRICE_LINE";
  entityId: string;
  revisionId: string;
  label: string;
  value?: string;
  deltaMinor?: string;
}>;
export type BuiltAiContext = Readonly<{
  revisionId: string;
  checksum: string;
  text: string;
  entities: readonly ContextEntity[];
}>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function buildAllowlistedContext(
  input: Readonly<{
    revisionId: string;
    locale: string;
    entities: readonly ContextEntity[];
    goal?: string;
  }>,
  maxEntities = 64,
): BuiltAiContext {
  const scoped = input.entities
    .filter((entity) => entity.revisionId === input.revisionId)
    .slice(0, maxEntities)
    .sort(
      (left, right) =>
        left.entityType.localeCompare(right.entityType) ||
        left.entityId.localeCompare(right.entityId),
    );
  const payload = {
    revisionId: input.revisionId,
    locale: input.locale,
    entities: scoped,
  };
  const serialized = canonical(payload);
  const user = `<catalog_context>${serialized}</catalog_context>${input.goal ? `<user_goal>${input.goal.slice(0, 1000)}</user_goal>` : ""}`;
  assertSafeAiInput(
    { system: "Use only catalog_context.", user, context: serialized },
    {
      ...defaultAiPolicy,
      maxContextChars: Math.min(defaultAiPolicy.maxContextChars, 24_000),
    },
  );
  return Object.freeze({
    revisionId: input.revisionId,
    checksum: canonical(payload),
    text: user,
    entities: Object.freeze(scoped),
  });
}

export function rankAlternatives(
  entities: readonly ContextEntity[],
  budgetMinor: bigint,
  maxCandidates = 3,
  revisionId?: string,
): readonly ContextEntity[] {
  return Object.freeze(
    entities
      .filter(
        (entity) =>
          entity.entityType === "OPTION" &&
          (revisionId === undefined || entity.revisionId === revisionId) &&
          entity.deltaMinor !== undefined &&
          BigInt(entity.deltaMinor) <= budgetMinor,
      )
      .sort((left, right) =>
        BigInt(left.deltaMinor!) < BigInt(right.deltaMinor!)
          ? -1
          : BigInt(left.deltaMinor!) > BigInt(right.deltaMinor!)
            ? 1
            : left.entityId.localeCompare(right.entityId),
      )
      .slice(0, maxCandidates),
  );
}
