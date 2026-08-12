import {
  defaultStudioCatalog,
  defaultStudioConfiguration,
  findStudioAccessory,
  findStudioBase,
  findStudioWall,
  insertWall,
  remainingWidthMm,
  type StudioAccessoryCode,
  type StudioBaseCode,
  type StudioConfiguration,
  type StudioWallCode,
} from "@ai-estimate-studio/domain";

export { defaultStudioCatalog, defaultStudioConfiguration, remainingWidthMm };
export type {
  StudioAccessoryCode,
  StudioBaseCode,
  StudioConfiguration,
  StudioWallCode,
};

export const studioCatalogVersion = defaultStudioCatalog.version;
export const studioDepthMm = 3000;
export const studioHeightMm = 2800;

export const studioModuleLabels: Readonly<
  Record<
    StudioBaseCode | StudioWallCode | StudioAccessoryCode,
    Readonly<{ en: string; fr: string }>
  >
> = Object.freeze({
  P1: { en: "P1 · 1.25 m base", fr: "P1 · base 1,25 m" },
  P2: { en: "P2 · 2.50 m base", fr: "P2 · base 2,50 m" },
  P3: { en: "P3 · 3.75 m base", fr: "P3 · base 3,75 m" },
  P4: { en: "P4 · 5.00 m base", fr: "P4 · base 5,00 m" },
  M1: { en: "M1 · solid panel", fr: "M1 · panneau plein" },
  M2: { en: "M2 · 0.50 m module", fr: "M2 · module 0,50 m" },
  M3: { en: "M3 · 0.70 m module", fr: "M3 · module 0,70 m" },
  M4: { en: "M4 · 0.90 m module", fr: "M4 · module 0,90 m" },
  M5: { en: "M5 · 0.90 m module", fr: "M5 · module 0,90 m" },
  M6: { en: "M6 · 0.90 m module", fr: "M6 · module 0,90 m" },
  M7: { en: "M7 · 2.50 m glazed bay", fr: "M7 · baie vitrée 2,50 m" },
  M8: { en: "M8 · 3.75 m glazed bay", fr: "M8 · baie vitrée 3,75 m" },
  M9: { en: "M9 · 2.50 m opening", fr: "M9 · ouverture 2,50 m" },
  M10: { en: "M10 · 3.75 m solid wall", fr: "M10 · mur plein 3,75 m" },
  C1: { en: "C1 · canopy", fr: "C1 · bandeau casquette" },
  CLAUSTRA: { en: "Claustra · privacy screen", fr: "Claustra · brise-vue" },
});

export const studioCopy = Object.freeze({
  en: {
    brand: "Mobup Studio",
    kicker: "Architectural 3D configurator",
    title: "Your garden studio,\nconfigured in real time.",
    intro:
      "Start with a complete 3D studio. Turn it, inspect it, then shape the facade without leaving the scene.",
    ready: "3D view ready",
    loading: "Preparing your studio…",
    webglFallback:
      "3D preview unavailable. The configuration and estimate remain available below.",
    orbit: "Drag to orbit",
    zoom: "Scroll to zoom",
    reset: "Reset view",
    analysis: "Analysis",
    hideAnalysis: "Hide analysis",
    base: "Base",
    facade: "Facade modules",
    accessories: "Finishing details",
    clickToAdd: "Click to add or drag onto the facade",
    remaining: "Remaining width",
    used: "Used width",
    full: "Facade filled",
    incompatible: "This module is wider than the remaining facade space.",
    noWall: "Attach this detail to a wall first.",
    estimate: "Indicative estimate",
    subtotal: "Subtotal HT",
    vat: "VAT",
    total: "Total incl. VAT",
    nonContractual: "Estimate only · non-contractual",
    download: "Download estimate PDF",
    downloadReady: "PDF downloaded",
    downloadError:
      "The PDF could not be created. Your configuration is still saved.",
    contactOptional: "Contact details (optional)",
    projectName: "Project name",
    customerName: "Your name",
    customerEmail: "Email",
    language: "Language",
    material: "Materials",
    dimensions: "Dimensions",
    width: "width",
    depth: "depth",
    height: "height",
  },
  fr: {
    brand: "Mobup Studio",
    kicker: "Configurateur architectural 3D",
    title: "Votre studio de jardin,\nconfiguré en direct.",
    intro:
      "Commencez avec un studio 3D complet. Tournez-le, analysez-le, puis composez la façade sans quitter la scène.",
    ready: "Vue 3D prête",
    loading: "Préparation du studio…",
    webglFallback:
      "L’aperçu 3D est indisponible. La configuration et l’estimation restent disponibles ci-dessous.",
    orbit: "Glisser pour pivoter",
    zoom: "Défiler pour zoomer",
    reset: "Réinitialiser",
    analysis: "Analyse",
    hideAnalysis: "Masquer l’analyse",
    base: "Base",
    facade: "Modules de façade",
    accessories: "Détails de finition",
    clickToAdd: "Cliquer pour ajouter ou déposer sur la façade",
    remaining: "Largeur restante",
    used: "Largeur utilisée",
    full: "Façade remplie",
    incompatible: "Ce module est plus large que l’espace restant en façade.",
    noWall: "Attachez d’abord ce détail à un mur.",
    estimate: "Estimation indicative",
    subtotal: "Sous-total HT",
    vat: "TVA",
    total: "Total TTC",
    nonContractual: "Estimation uniquement · non contractuelle",
    download: "Télécharger l’estimation PDF",
    downloadReady: "PDF téléchargé",
    downloadError:
      "Le PDF n’a pas pu être créé. Votre configuration est conservée.",
    contactOptional: "Coordonnées (facultatif)",
    projectName: "Nom du projet",
    customerName: "Votre nom",
    customerEmail: "E-mail",
    language: "Langue",
    material: "Matériaux",
    dimensions: "Dimensions",
    width: "largeur",
    depth: "profondeur",
    height: "hauteur",
  },
} as const);

export type StudioLanguage = keyof typeof studioCopy;
export type StudioCopy = (typeof studioCopy)[StudioLanguage];

export function studioLabel(
  code: StudioBaseCode | StudioWallCode | StudioAccessoryCode,
  language: StudioLanguage,
): string {
  return studioModuleLabels[code][language];
}

export function studioModulePriceMinor(
  code: StudioBaseCode | StudioWallCode | StudioAccessoryCode,
): number {
  return (
    findStudioBase(defaultStudioCatalog, code as StudioBaseCode)?.priceMinor ??
    findStudioWall(defaultStudioCatalog, code as StudioWallCode)?.priceMinor ??
    findStudioAccessory(defaultStudioCatalog, code as StudioAccessoryCode)
      ?.priceMinor ??
    0
  );
}

export function isStudioWallCode(value: string): value is StudioWallCode {
  return (
    findStudioWall(defaultStudioCatalog, value as StudioWallCode) !== undefined
  );
}

export function isStudioBaseCode(value: string): value is StudioBaseCode {
  return (
    findStudioBase(defaultStudioCatalog, value as StudioBaseCode) !== undefined
  );
}

export function isStudioAccessoryCode(
  value: string,
): value is StudioAccessoryCode {
  return (
    findStudioAccessory(defaultStudioCatalog, value as StudioAccessoryCode) !==
    undefined
  );
}

export function rebuildStudioConfiguration(
  baseCode: StudioBaseCode,
  walls: readonly Readonly<{ id: string; code: StudioWallCode }>[],
  accessories: readonly Readonly<{
    id: string;
    code: StudioAccessoryCode;
    targetWallId: string;
  }>[],
): StudioConfiguration | undefined {
  let current: StudioConfiguration = Object.freeze({
    catalogVersion: studioCatalogVersion,
    baseCode,
    walls: Object.freeze([]),
    accessories: Object.freeze([]),
  });
  const rebuiltWalls: Array<Readonly<{ id: string; code: StudioWallCode }>> =
    [];
  for (const wall of walls) {
    const result = insertWall(current, wall.code, current.walls.length);
    if (!result.ok) return undefined;
    current = result.configuration;
    rebuiltWalls.push({ id: wall.id, code: wall.code });
  }
  const wallIds = new Set(rebuiltWalls.map((wall) => wall.id));
  if (accessories.some((item) => !wallIds.has(item.targetWallId)))
    return undefined;
  return Object.freeze({
    ...current,
    walls: Object.freeze(rebuiltWalls),
    accessories: Object.freeze(
      accessories.map((item) => Object.freeze({ ...item })),
    ),
  });
}

export function isValidStudioConfiguration(
  configuration: StudioConfiguration,
): boolean {
  return (
    configuration.catalogVersion === studioCatalogVersion &&
    rebuildStudioConfiguration(
      configuration.baseCode,
      configuration.walls,
      configuration.accessories,
    ) !== undefined
  );
}

export { defaultStudioCatalog as studioCatalog };
