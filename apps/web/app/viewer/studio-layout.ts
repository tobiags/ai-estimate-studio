import type { StudioEnvironmentAssetPlacement } from "./studio-environment-assets";

/**
 * The visible terrain is intentionally wider than every studio variant. Keep
 * all contextual objects inside that envelope and outside the studio
 * footprint, instead of relying on fixed coordinates that only work for P1.
 */
export const studioTerrainHalfWidth = 4.8;
export const defaultStudioWidth = 3.75;

const poolGap = 0.35;
const poolMaxHalfWidth = 1.125;
const poolMinHalfWidth = 0.72;

export type StudioPoolLayout = Readonly<{
  x: number;
  z: number;
  outerWidth: number;
  waterWidth: number;
  depth: number;
  gap: number;
}>;

/** Return a pool position that never intersects the studio footprint. */
export function studioPoolLayout(
  studioWidth = defaultStudioWidth,
): StudioPoolLayout {
  const width = Math.max(0, studioWidth);
  const availableHalfWidth = (studioTerrainHalfWidth - width / 2 - poolGap) / 2;
  const halfWidth = Math.min(
    poolMaxHalfWidth,
    Math.max(poolMinHalfWidth, availableHalfWidth),
  );
  const outerWidth = halfWidth * 2;
  return {
    x: width / 2 + poolGap + halfWidth,
    z: 0,
    outerWidth,
    waterWidth: Math.max(1.2, outerWidth - 0.18),
    depth: 4.45,
    gap: poolGap,
  };
}

/**
 * Resolve a dressing asset against the current studio width. The source plan
 * keeps a useful fallback coordinate for previews and metadata; the runtime
 * position is derived from the selected base so furniture cannot be embedded
 * in the building when the user switches P1–P4.
 */
export function resolveStudioAssetPosition(
  placement: Pick<
    StudioEnvironmentAssetPlacement,
    "position" | "side" | "clearanceFromStudio"
  >,
  studioWidth = defaultStudioWidth,
): readonly [number, number, number] {
  if (!placement.side || placement.clearanceFromStudio === undefined) {
    return placement.position;
  }
  const side = placement.side === "left" ? -1 : 1;
  const x =
    side *
    (Math.max(0, studioWidth) / 2 + Math.max(0, placement.clearanceFromStudio));
  return [x, placement.position[1], placement.position[2]];
}
