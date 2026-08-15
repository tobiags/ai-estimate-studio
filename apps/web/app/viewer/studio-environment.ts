import * as THREE from "three";
import type { StudioEnvironmentCode } from "../studio/environments";
import type { StudioMaterialSet } from "./studio-model";
import { studioTerrainHeight, studioTerrainProfiles } from "./studio-terrain";
import { loadThreeEnvironmentAssets } from "./studio-environment-assets";

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

function cylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  material: THREE.Material,
  name: string,
  position: [number, number, number],
): THREE.Mesh {
  return mesh(
    parent,
    new THREE.CylinderGeometry(radius, radius * 1.08, height, 24),
    material,
    name,
    position,
  );
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
  for (const [index, x, z] of [
    [1, -3.25, -1.65],
    [2, 3.25, 1.65],
  ] as const) {
    box(root, [1.35, 0.08, 1.8], materials.soil, `garden-bed-${index}`, [
      x,
      0.02,
      z,
    ]);
    cylinder(root, 0.28, 0.42, materials.foliage, `garden-shrub-${index}`, [
      x,
      0.25,
      z,
    ]);
  }
}

function addPoolContext(
  root: THREE.Group,
  materials: ReturnType<typeof environmentMaterials>,
): void {
  addProceduralTerrain(root, "pool", materials.grass);
  box(root, [8.8, 0.12, 6.8], materials.mineral, "pool-deck", [0, -0.08, 0]);
  const poolX = 3.25;
  const poolZ = 0;
  box(root, [2.25, 0.055, 4.45], materials.water, "pool-water", [
    poolX,
    0.03,
    poolZ,
  ]);
  box(
    root,
    [2.45, 0.08, 0.12],
    materials.mineral.clone(),
    "pool-coping-front",
    [poolX, 0.06, poolZ - 2.28],
  );
  box(root, [2.45, 0.08, 0.12], materials.mineral.clone(), "pool-coping-back", [
    poolX,
    0.06,
    poolZ + 2.28,
  ]);
  box(root, [0.12, 0.08, 4.45], materials.mineral.clone(), "pool-coping-left", [
    poolX - 1.18,
    0.06,
    poolZ,
  ]);
  box(
    root,
    [0.12, 0.08, 4.45],
    materials.mineral.clone(),
    "pool-coping-right",
    [poolX + 1.18, 0.06, poolZ],
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
  for (const [index, x] of [
    [1, -3.25],
    [2, 3.25],
  ] as const) {
    box(
      root,
      [0.62, 0.52, 0.62],
      materials.cedar.clone(),
      `terrace-planter-${index}`,
      [x, 0.28, 1.85],
    );
    cylinder(root, 0.22, 0.6, materials.foliage, `terrace-plant-${index}`, [
      x,
      0.78,
      1.85,
    ]);
  }
}

export function createMobupEnvironmentScene(
  environment: StudioEnvironmentCode,
  materials: StudioMaterialSet = {},
): THREE.Group {
  const root = new THREE.Group();
  root.name = `mobup-environment-${environment}`;
  root.userData = { environment };
  const sceneMaterials = environmentMaterials(materials);

  if (environment === "pool") addPoolContext(root, sceneMaterials);
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
