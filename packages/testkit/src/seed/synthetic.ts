export interface SyntheticSeedRecord {
  readonly id: string;
  readonly kind: "organization" | "category" | "product";
  readonly name: string;
  readonly parentId?: string;
  readonly synthetic: true;
}

const organizationId = "seed-organization-demo";
const categoryFixtures = [
  ["pool", "Pool"],
  ["pergola", "Pergola"],
  ["garden-shed", "Garden Shed"],
  ["roofing", "Roofing"],
] as const;

const records: SyntheticSeedRecord[] = [
  {
    id: organizationId,
    kind: "organization",
    name: "AI Estimate Studio Demo",
    synthetic: true,
  },
  ...categoryFixtures.flatMap(([slug, name]) => {
    const categoryId = `seed-category-${slug}`;

    return [
      {
        id: categoryId,
        kind: "category" as const,
        name,
        parentId: organizationId,
        synthetic: true as const,
      },
      {
        id: `seed-product-${slug}`,
        kind: "product" as const,
        name: `Demo ${name}`,
        parentId: categoryId,
        synthetic: true as const,
      },
    ];
  }),
];

export const syntheticSeedRecords: readonly SyntheticSeedRecord[] =
  Object.freeze(
    records.map((record) =>
      Object.freeze({
        ...record,
      }),
    ),
  );

export function applySyntheticSeed(
  existing: readonly SyntheticSeedRecord[],
): readonly SyntheticSeedRecord[] {
  const recordsById = new Map(existing.map((record) => [record.id, record]));

  for (const record of syntheticSeedRecords) {
    recordsById.set(record.id, record);
  }

  return Object.freeze([...recordsById.values()]);
}
