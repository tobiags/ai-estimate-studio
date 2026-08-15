import type { application, Node } from "claygl";
import type * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { StudioEnvironmentCode } from "../studio/environments";
import {
  getUltraShapeAssetRefinement,
  resolveUltraShapeAssetPath,
} from "./ultrashape-assets";

export type StudioEnvironmentAssetPlacement = Readonly<{
  id: string;
  path: string;
  license: "CC0";
  source: string;
  position: readonly [number, number, number];
  scale: number;
  rotationY?: number;
}>;

/**
 * CC0 Poly Haven assets already committed to the application. Procedural
 * terrain remains the base layer; these assets provide the close-range
 * material and silhouette detail that a sales demo needs.
 */
export const studioEnvironmentAssetPlans: Readonly<
  Record<StudioEnvironmentCode, readonly StudioEnvironmentAssetPlacement[]>
> = Object.freeze({
  garden: Object.freeze([
    {
      id: "garden-table-set",
      path: "/assets/models/polyhaven/outdoor_table_chair_set_01/outdoor_table_chair_set_01_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/outdoor_table_chair_set_01",
      position: [-2.25, -0.03, 1.55] as const,
      scale: 1.65,
      rotationY: -0.22,
    },
    {
      id: "garden-bench",
      path: "/assets/models/polyhaven/painted_wooden_bench_1k/painted_wooden_bench_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/painted_wooden_bench",
      position: [3.05, -0.02, -2.1] as const,
      scale: 1.15,
      rotationY: -0.45,
    },
    {
      id: "garden-plant",
      path: "/assets/models/polyhaven/potted_plant_01/potted_plant_01_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/potted_plant_01",
      position: [-3.1, -0.02, -1.95] as const,
      scale: 0.82,
      rotationY: 0.25,
    },
  ]),
  pool: Object.freeze([
    {
      id: "pool-table-set",
      path: "/assets/models/polyhaven/outdoor_table_chair_set_01/outdoor_table_chair_set_01_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/outdoor_table_chair_set_01",
      position: [-2.05, -0.03, 1.7] as const,
      scale: 1.5,
      rotationY: 0.18,
    },
    {
      id: "pool-lantern",
      path: "/assets/models/polyhaven/Lantern_01/Lantern_01_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/lantern_01",
      position: [3.1, 0.03, -2.3] as const,
      scale: 1.45,
      rotationY: 0.35,
    },
    {
      id: "pool-plant",
      path: "/assets/models/polyhaven/potted_plant_01/potted_plant_01_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/potted_plant_01",
      position: [2.78, -0.02, 2.15] as const,
      scale: 0.78,
      rotationY: -0.35,
    },
  ]),
  terrace: Object.freeze([
    {
      id: "terrace-bench",
      path: "/assets/models/polyhaven/painted_wooden_bench_1k/painted_wooden_bench_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/painted_wooden_bench",
      position: [-2.65, -0.02, 1.78] as const,
      scale: 1.45,
      rotationY: 0.14,
    },
    {
      id: "terrace-fire-pit",
      path: "/assets/models/polyhaven/stone_fire_pit/stone_fire_pit_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/stone_fire_pit",
      position: [3.05, 0.14, -1.95] as const,
      scale: 0.62,
      rotationY: -0.25,
    },
    {
      id: "terrace-plant",
      path: "/assets/models/polyhaven/potted_plant_01/potted_plant_01_1k.gltf",
      license: "CC0" as const,
      source: "https://polyhaven.com/a/potted_plant_01",
      position: [-2.9, -0.02, -1.85] as const,
      scale: 0.82,
      rotationY: 0.18,
    },
  ]),
});

const publicAssetPath = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

function resolvedAssetPath(placement: StudioEnvironmentAssetPlacement): string {
  const refinement = getUltraShapeAssetRefinement(placement.id);
  return resolveUltraShapeAssetPath(placement.path, refinement).path;
}

function prepareClayAsset(
  node: Node,
  placement: StudioEnvironmentAssetPlacement,
) {
  node.name = `environment-asset-${placement.id}`;
  node.position.set(...placement.position);
  node.scale.set(placement.scale, placement.scale, placement.scale);
  if (placement.rotationY) node.rotation.rotateY(placement.rotationY);
  node.traverse((child) => {
    const renderable = child as Node & {
      castShadow?: boolean;
      receiveShadow?: boolean;
    };
    renderable.castShadow = true;
    renderable.receiveShadow = true;
  });
}

/** Loads the local GLB/glTF environment dressing into the ClayGL scene. */
export async function loadClayEnvironmentAssets(
  app: application.App3D,
  parent: Node,
  environment: StudioEnvironmentCode,
): Promise<readonly string[]> {
  const loaded = await Promise.allSettled(
    studioEnvironmentAssetPlans[environment].map(async (placement) => {
      const result = await app.loadModel(
        publicAssetPath(resolvedAssetPath(placement)),
        {
          shader: "clay.standardMR",
          waitTextureLoaded: true,
          textureConvertToPOT: true,
        },
        parent,
      );
      if (result.rootNode) prepareClayAsset(result.rootNode, placement);
      return placement.id;
    }),
  );
  return Object.freeze(
    loaded.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    ),
  );
}

function prepareThreeAsset(
  scene: THREE.Object3D,
  placement: StudioEnvironmentAssetPlacement,
): void {
  scene.name = `environment-asset-${placement.id}`;
  scene.position.set(...placement.position);
  scene.scale.setScalar(placement.scale);
  scene.rotation.y = placement.rotationY ?? 0;
  scene.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

/** Loads the same assets for the explicit Three.js fallback renderer. */
export async function loadThreeEnvironmentAssets(
  parent: THREE.Object3D,
  environment: StudioEnvironmentCode,
): Promise<readonly string[]> {
  const loader = new GLTFLoader();
  const loaded = await Promise.allSettled(
    studioEnvironmentAssetPlans[environment].map(async (placement) => {
      const result = await loader.loadAsync(
        publicAssetPath(resolvedAssetPath(placement)),
      );
      prepareThreeAsset(result.scene, placement);
      parent.add(result.scene);
      return placement.id;
    }),
  );
  return Object.freeze(
    loaded.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    ),
  );
}
