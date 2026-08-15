import type { StudioEnvironmentCode } from "../studio/environments";

/**
 * Small deterministic height field inspired by ProceduralTerrains' seeded
 * terrain model. It is intentionally local to the viewer: it gives the
 * outdoor context believable variation without making the quote experience
 * dependent on a second runtime engine or a network request.
 */
export type StudioTerrainProfile = Readonly<{
  seed: number;
  width: number;
  depth: number;
  subdivisions: readonly [number, number];
}>;

export const studioTerrainProfiles: Readonly<
  Record<StudioEnvironmentCode, StudioTerrainProfile>
> = Object.freeze({
  garden: Object.freeze({
    seed: 17,
    width: 9.6,
    depth: 7.2,
    subdivisions: [24, 20] as const,
  }),
  pool: Object.freeze({
    seed: 29,
    width: 9.6,
    depth: 7.2,
    subdivisions: [24, 20] as const,
  }),
  terrace: Object.freeze({
    seed: 43,
    width: 9.6,
    depth: 7.2,
    subdivisions: [24, 20] as const,
  }),
});

function hash2d(x: number, z: number, seed: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);
  const n00 = hash2d(x0, z0, seed);
  const n10 = hash2d(x0 + 1, z0, seed);
  const n01 = hash2d(x0, z0 + 1, seed);
  const n11 = hash2d(x0 + 1, z0 + 1, seed);
  const nx0 = n00 + (n10 - n00) * tx;
  const nx1 = n01 + (n11 - n01) * tx;
  return nx0 + (nx1 - nx0) * tz;
}

/** Returns the terrain surface height in metres for world-space x/z. */
export function studioTerrainHeight(
  environment: StudioEnvironmentCode,
  x: number,
  z: number,
): number {
  const profile = studioTerrainProfiles[environment];
  const edgeX = Math.min(1, Math.abs(x) / (profile.width * 0.5));
  const edgeZ = Math.min(1, Math.abs(z) / (profile.depth * 0.5));
  const edge = Math.max(edgeX, edgeZ);
  const lowFrequency = valueNoise(x * 0.75, z * 0.75, profile.seed) - 0.5;
  const highFrequency = valueNoise(x * 1.9, z * 1.9, profile.seed + 11) - 0.5;
  const edgeLift = edge * edge * 0.08;
  const texture = lowFrequency * 0.055 + highFrequency * 0.012;

  if (environment === "pool") {
    // Keep the deck level near the pool while the perimeter still reads as a
    // landscaped site rather than a perfectly flat debug plane.
    const deckDistance = Math.max(Math.abs(x - 3.15) / 1.35, Math.abs(z) / 2.3);
    const deckBlend = 1 - smoothstep(Math.max(0, 1 - deckDistance));
    return -0.032 + texture * (0.35 + deckBlend * 0.65) + edgeLift * deckBlend;
  }

  if (environment === "terrace") {
    return -0.032 + z * 0.006 + texture * 0.52 + edgeLift * 0.65;
  }

  return -0.032 + texture + edgeLift;
}

export function studioTerrainSampleGrid(
  environment: StudioEnvironmentCode,
): readonly number[] {
  const profile = studioTerrainProfiles[environment];
  const [columns, rows] = profile.subdivisions;
  const heights: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const z = (row / rows - 0.5) * profile.depth;
    for (let column = 0; column <= columns; column += 1) {
      const x = (column / columns - 0.5) * profile.width;
      heights.push(studioTerrainHeight(environment, x, z));
    }
  }
  return Object.freeze(heights);
}
