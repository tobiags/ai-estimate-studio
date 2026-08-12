export const studioEnvironmentCodes = ["garden", "pool", "terrace"] as const;

export type StudioEnvironmentCode = (typeof studioEnvironmentCodes)[number];

export const defaultStudioEnvironment: StudioEnvironmentCode = "garden";

export type StudioEnvironmentDefinition = Readonly<{
  code: StudioEnvironmentCode;
  label: Readonly<{ en: string; fr: string }>;
  description: Readonly<{ en: string; fr: string }>;
}>;

export const studioEnvironments: readonly StudioEnvironmentDefinition[] =
  Object.freeze([
    {
      code: "garden",
      label: { en: "Garden", fr: "Jardin" },
      description: { en: "Soft landscape", fr: "Paysage végétal" },
    },
    {
      code: "pool",
      label: { en: "Poolside", fr: "Bord de piscine" },
      description: { en: "Water and stone", fr: "Eau et pierre" },
    },
    {
      code: "terrace",
      label: { en: "Terrace", fr: "Terrasse" },
      description: { en: "Contemporary deck", fr: "Deck contemporain" },
    },
  ]);

export function isStudioEnvironmentCode(
  value: string,
): value is StudioEnvironmentCode {
  return (studioEnvironmentCodes as readonly string[]).includes(value);
}

export function studioEnvironmentLabel(
  code: StudioEnvironmentCode,
  language: "en" | "fr",
): string {
  return (
    studioEnvironments.find((environment) => environment.code === code)?.label[
      language
    ] ?? code
  );
}
