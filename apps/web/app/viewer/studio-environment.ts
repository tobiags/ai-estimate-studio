import * as THREE from "three";
import type { StudioEnvironmentCode } from "../studio/environments";
import type { StudioMaterialSet } from "./studio-model";
import { studioTerrainHeight, studioTerrainProfiles } from "./studio-terrain";
import { loadThreeEnvironmentAssets } from "./studio-environment-assets";
import { studioPoolLayout } from "./studio-layout";

function materialOr(
  material: THREE.Material | undefined,
  fallback: THREE.Material,
): THREE.Material {
  return material?.clone() ?? fallback;
}

function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position: [number, number, number],
): THREE.Mesh {
  const child = new THREE.Mesh(geometry, material);
  child.name = name;
  child.position.set(...position);
  child.castShadow = true;
  child.receiveShadow = true;
  parent.add(child);
  return child;
}

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  material: THREE.Material,
  name: string,
  position: [number, number, number],
): THREE.Mesh {
  return mesh(parent, new THREE.BoxGeometry(...size), material, name, position);
}

function environmentMaterials(materials: StudioMaterialSet) {
  return {
    mineral: materialOr(
      materials.mineral,
      new THREE.MeshStandardMaterial({
        color: "#aaa69d",
        roughness: 0.82,
      }),
    ),
    cedar: materialOr(
      materials.cedar,
      new THREE.MeshStandardMaterial({
        color: "#9a603d",
        roughness: 0.66,
      }),
    ),
    grass: materialOr(
      materials.grass,
      new THREE.MeshStandardMaterial({
        color: "#728b62",
        roughness: 0.98,
      }),
    ),
    soil: new THREE.MeshStandardMaterial({
      color: "#3f3027",
      roughness: 1,
    }),
    foliage: new THREE.MeshStandardMaterial({
      color: "#4f754d",
      roughness: 0.94,
    }),
    water: new THREE.MeshPhysicalMaterial({
      color: "#6aa9b8",
      roughness: 0.12,
      metalness: 0.05,
      transmission: 0.12,
      transparent: true,
      opacity: 0.84,
    }),
  };
}

function addProceduralTerrain(
  root: THREE.Group,
  environment: StudioEnvironmentCode,
  material: THREE.Material,
): void {
  const profile = studioTerrainProfiles[environment];
  const [columns, rows] = profile.subdivisions;
  const geometry = new THREE.PlaneGeometry(
    profile.width,
    profile.depth,
    columns,
    rows,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    positions.setY(
      index,
      studioTerrainHeight(
        environment,
        positions.getX(index),
        positions.getZ(index),
      ),
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  mesh(
    root,
    geometry,
    material,
    `procedural-terrain-${environment}`,
    [0, 0, 0],
  );
}

function addGardenContext(
  root: THREE.Group,
  materials: ReturnType<typeof environmentMaterials>,
): void {
  addProceduralTerrain(root, "garden", materials.grass);
  box(root, [8.8, 0.12, 6.8], materials.grass, "garden-ground", [0, -0.08, 0]);
  box(root, [5.9, 0.04, 3.7], materials.mineral, "garden-path", [0, -0.005, 0]);
}

function addPoolContext(
  root: THREE.Group,
  materials: ReturnType<typeof environmentMaterials>,
  studioWidth: number,
): void {
  addProceduralTerrain(root, "pool", materials.grass);
  box(root, [8.8, 0.12, 6.8], materials.mineral, "pool-deck", [0, -0.08, 0]);
  const pool = studioPoolLayout(studioWidth);
  const poolHalfWidth = pool.outerWidth / 2;
  const poolHalfDepth = pool.depth / 2;
  box(
    root,
    [pool.waterWidth, 0.055, pool.depth],
    materials.water,
    "pool-water",
    [pool.x, 0.03, pool.z],
  );
  box(
    root,
    [pool.outerWidth, 0.08, 0.12],
    materials.mineral.clone(),
    "pool-coping-front",
    [pool.x, 0.06, pool.z - poolHalfDepth - 0.03],
  );
  box(
    root,
    [pool.outerWidth, 0.08, 0.12],
    materials.mineral.clone(),
    "pool-coping-back",
    [pool.x, 0.06, pool.z + poolHalfDepth + 0.03],
  );
  box(
    root,
    [0.12, 0.08, pool.depth],
    materials.mineral.clone(),
    "pool-coping-left",
    [pool.x - poolHalfWidth, 0.06, pool.z],
  );
  box(
    root,
    [0.12, 0.08, pool.depth],
    materials.mineral.clone(),
    "pool-coping-right",
    [pool.x + poolHalfWidth, 0.06, pool.z],
  );
}

function addTerraceContext(
  root: THREE.Group,
  materials: ReturnType<typeof environmentMaterials>,
): void {
  addProceduralTerrain(root, "terrace", materials.grass);
  box(
    root,
    [8.8, 0.12, 6.8],
    materials.mineral,
    "terrace-ground",
    [0, -0.08, 0],
  );
  box(
    root,
    [6.2, 0.08, 3.9],
    materials.cedar.clone(),
    "terrace-deck",
    [0, 0.02, 0.12],
  );
}

export function createMobupEnvironmentScene(
  environment: StudioEnvironmentCode,
  materials: StudioMaterialSet = {},
  studioWidth = 3.75,
): THREE.Group {
  const root = new THREE.Group();
  root.name = `mobup-environment-${environment}`;
  root.userData = { environment };
  const sceneMaterials = environmentMaterials(materials);

  if (environment === "pool") addPoolContext(root, sceneMaterials, studioWidth);
  else if (environment === "terrace") addTerraceContext(root, sceneMaterials);
  else addGardenContext(root, sceneMaterials);

  root.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return root;
}

export { loadThreeEnvironmentAssets };

export function disposeMobupEnvironment(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
}
