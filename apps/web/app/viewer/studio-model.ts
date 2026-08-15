import * as THREE from "three";
import {
  defaultStudioCatalog,
  findStudioBase,
  findStudioWall,
  type StudioCatalog,
  type StudioConfiguration,
  type StudioWall,
} from "@ai-estimate-studio/domain";

export type StudioMaterialSet = Readonly<{
  cedar?: THREE.Material;
  graphite?: THREE.Material;
  mineral?: THREE.Material;
  grass?: THREE.Material;
  glass?: THREE.Material;
}>;

export type MobupStudioModel = THREE.Group & {
  userData: THREE.Group["userData"] & {
    mobup: Readonly<{
      baseCode: string;
      widthMm: number;
      depthMm: number;
      heightMm: number;
      usedWidthMm: number;
      wallIds: readonly string[];
      accessoryIds: readonly string[];
    }>;
  };
};

const meters = (millimetres: number) => millimetres / 1000;

function materialOr(
  material: THREE.Material | undefined,
  fallback: THREE.Material,
): THREE.Material {
  return material?.clone() ?? fallback;
}

function graphiteMaterial(materials: StudioMaterialSet): THREE.Material {
  return materialOr(
    materials.graphite,
    new THREE.MeshStandardMaterial({
      color: "#242424",
      metalness: 0.78,
      roughness: 0.27,
    }),
  );
}

function cedarMaterial(materials: StudioMaterialSet): THREE.Material {
  return materialOr(
    materials.cedar,
    new THREE.MeshStandardMaterial({
      color: "#9a603d",
      roughness: 0.66,
      metalness: 0.04,
    }),
  );
}

function mineralMaterial(materials: StudioMaterialSet): THREE.Material {
  return materialOr(
    materials.mineral,
    new THREE.MeshStandardMaterial({
      color: "#a8a39a",
      roughness: 0.86,
      metalness: 0,
    }),
  );
}

function glassMaterial(materials: StudioMaterialSet): THREE.Material {
  return materialOr(
    materials.glass,
    new THREE.MeshPhysicalMaterial({
      color: "#c6d8da",
      metalness: 0.08,
      roughness: 0.12,
      transmission: 0.35,
      transparent: true,
      opacity: 0.48,
      thickness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
}

function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position?: THREE.Vector3,
): THREE.Mesh {
  const child = new THREE.Mesh(geometry, material);
  child.name = name;
  if (position) child.position.copy(position);
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
  return mesh(
    parent,
    new THREE.BoxGeometry(...size),
    material,
    name,
    new THREE.Vector3(...position),
  );
}

function addCladdingSlats(
  wallGroup: THREE.Group,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  const spacing = 0.085;
  const count = Math.max(2, Math.ceil(width / spacing));
  const slatWidth = Math.min(0.035, width / count - 0.008);
  for (let index = 0; index < count; index += 1) {
    const x = -width / 2 + (index + 0.5) * (width / count);
    box(
      wallGroup,
      [slatWidth, height - 0.1, depth],
      material.clone(),
      `cladding-slat-${index + 1}`,
      [x, height / 2, 0],
    );
  }
}

function addSolidWall(
  wallGroup: THREE.Group,
  wall: StudioWall,
  materials: StudioMaterialSet,
) {
  const width = meters(wall.widthMm);
  const height = meters(wall.heightMm);
  const cedar = cedarMaterial(materials);
  addCladdingSlats(wallGroup, width, height, 0.08, cedar);
  box(
    wallGroup,
    [width, 0.11, 0.16],
    graphiteMaterial(materials),
    "wall-bottom-rail",
    [0, 0.055, 0],
  );
  box(
    wallGroup,
    [width, 0.11, 0.16],
    graphiteMaterial(materials),
    "wall-top-rail",
    [0, height - 0.055, 0],
  );
}

function addGlazedWall(
  wallGroup: THREE.Group,
  wall: StudioWall,
  materials: StudioMaterialSet,
) {
  const width = meters(wall.widthMm);
  const height = meters(wall.heightMm);
  const graphite = graphiteMaterial(materials);
  const glass = glassMaterial(materials);
  const frame = 0.075;
  const paneWidth = Math.max(0.2, width - frame * 2);
  box(wallGroup, [paneWidth, height - frame * 2, 0.025], glass, "glazed-pane", [
    0,
    height / 2,
    0,
  ]);
  box(wallGroup, [width, frame, 0.14], graphite, "glazed-bottom-rail", [
    0,
    frame / 2,
    0,
  ]);
  box(wallGroup, [width, frame, 0.14], graphite, "glazed-top-rail", [
    0,
    height - frame / 2,
    0,
  ]);
  box(wallGroup, [frame, height, 0.14], graphite, "glazed-left-frame", [
    -width / 2 + frame / 2,
    height / 2,
    0,
  ]);
  box(wallGroup, [frame, height, 0.14], graphite, "glazed-right-frame", [
    width / 2 - frame / 2,
    height / 2,
    0,
  ]);
  const mullions = wall.code === "M8" ? 2 : 1;
  for (let index = 1; index <= mullions; index += 1) {
    const x = -width / 2 + (width * index) / (mullions + 1);
    box(
      wallGroup,
      [0.045, height - frame * 2, 0.16],
      graphite.clone(),
      `glazed-mullion-${index}`,
      [x, height / 2, -0.015],
    );
  }
  box(wallGroup, [0.12, 0.36, 0.18], graphite.clone(), "glazed-handle", [
    width * 0.18,
    height * 0.5,
    -0.08,
  ]);
}

function addOpeningWall(
  wallGroup: THREE.Group,
  wall: StudioWall,
  materials: StudioMaterialSet,
) {
  const width = meters(wall.widthMm);
  const height = meters(wall.heightMm);
  const graphite = graphiteMaterial(materials);
  const cedar = cedarMaterial(materials);
  const openingWidth = Math.min(
    width - 0.14,
    meters(wall.innerOpeningWidthMm ?? 0),
  );
  const openingHeight = Math.min(
    height - 0.14,
    meters(wall.innerOpeningHeightMm ?? 0),
  );
  if (openingWidth <= 0 || openingHeight <= 0) {
    addSolidWall(wallGroup, wall, materials);
    return;
  }
  const sideWidth = Math.max(0.07, (width - openingWidth) / 2);
  const lintelHeight = Math.max(0.07, height - openingHeight);
  box(wallGroup, [sideWidth, openingHeight, 0.1], cedar, "opening-left-panel", [
    -(width - sideWidth) / 2,
    openingHeight / 2,
    0,
  ]);
  box(
    wallGroup,
    [sideWidth, openingHeight, 0.1],
    cedar.clone(),
    "opening-right-panel",
    [(width - sideWidth) / 2, openingHeight / 2, 0],
  );
  box(
    wallGroup,
    [openingWidth, lintelHeight, 0.1],
    cedar.clone(),
    "opening-lintel",
    [0, openingHeight + lintelHeight / 2, 0],
  );
  box(
    wallGroup,
    [openingWidth, 0.06, 0.14],
    graphite,
    "opening-sill",
    [0, 0.03, -0.03],
  );
  box(
    wallGroup,
    [openingWidth, 0.06, 0.14],
    graphite.clone(),
    "opening-header",
    [0, openingHeight, -0.03],
  );
}

function addWall(
  parent: THREE.Group,
  wall: StudioWall,
  id: string,
  x: number,
  depth: number,
  materials: StudioMaterialSet,
) {
  const group = new THREE.Group();
  group.name = `wall-${id}-${wall.code}`;
  group.position.set(x, 0.18, depth / 2);
  group.userData = {
    moduleCode: wall.code,
    moduleId: id,
    widthMm: wall.widthMm,
    heightMm: wall.heightMm,
    material: wall.kind === "GLAZED" ? "graphite + glass" : "cedar cladding",
  };
  if (wall.kind === "GLAZED") addGlazedWall(group, wall, materials);
  else if (wall.kind === "OPENING") addOpeningWall(group, wall, materials);
  else addSolidWall(group, wall, materials);
  parent.add(group);
  return group;
}

function addAccessory(
  parent: THREE.Group,
  accessory: StudioConfiguration["accessories"][number],
  wallGroup: THREE.Group,
  wall: StudioWall,
  materials: StudioMaterialSet,
) {
  const group = new THREE.Group();
  group.name = `accessory-${accessory.id}-${accessory.code}`;
  group.userData = {
    accessoryCode: accessory.code,
    accessoryId: accessory.id,
    targetWallId: accessory.targetWallId,
    consumesWidthMm: 0,
  };
  const width = accessory.code === "CLAUSTRA" ? 1.25 : 0.8;
  const height = accessory.code === "CLAUSTRA" ? 2.25 : 0.18;
  const cedar = cedarMaterial(materials);
  const wallWidth = meters(wall.widthMm);
  if (accessory.code === "CLAUSTRA") {
    const slats = 9;
    for (let index = 0; index < slats; index += 1) {
      const x = -width / 2 + (index + 0.5) * (width / slats);
      box(
        group,
        [0.035, height, 0.1],
        cedar.clone(),
        `claustra-slat-${index + 1}`,
        [x, height / 2 + 0.12, -0.05],
      );
    }
  } else {
    box(group, [width, 0.16, 0.34], cedar, "canopy-panel", [
      0,
      height + 0.06,
      -0.08,
    ]);
  }
  group.position.copy(wallGroup.position);
  group.position.x += Math.min(
    0.15,
    Math.max(-0.15, wallWidth / 2 - width / 2),
  );
  parent.add(group);
}

export function createMobupStudioModel(
  configuration: StudioConfiguration,
  catalog: StudioCatalog = defaultStudioCatalog,
  materials: StudioMaterialSet = {},
): MobupStudioModel {
  const base = findStudioBase(catalog, configuration.baseCode);
  if (!base) throw new Error(`Unknown studio base: ${configuration.baseCode}`);
  const root = new THREE.Group() as MobupStudioModel;
  root.name = "mobup-studio-model";
  const width = meters(base.widthMm);
  const depth = meters(base.depthMm);
  const height = meters(base.heightMm);
  const graphite = graphiteMaterial(materials);
  const cedar = cedarMaterial(materials);
  const mineral = mineralMaterial(materials);

  const foundation = new THREE.Group();
  foundation.name = "foundation";
  foundation.userData = {
    widthMm: base.widthMm,
    depthMm: base.depthMm,
    material: "mineral",
  };
  box(
    foundation,
    [width, 0.18, depth],
    mineral,
    "foundation-slab",
    [0, 0.09, 0],
  );
  box(
    foundation,
    [width + 0.06, 0.12, depth + 0.06],
    graphite.clone(),
    "foundation-edge",
    [0, 0.02, 0],
  );
  root.add(foundation);

  const roof = new THREE.Group();
  roof.name = "roof";
  roof.userData = {
    widthMm: base.widthMm,
    depthMm: base.depthMm,
    heightMm: height * 1000,
    material: "graphite",
  };
  box(roof, [width + 0.16, 0.18, depth + 0.16], graphite, "flat-roof", [
    0,
    height + 0.09,
    0,
  ]);
  box(roof, [width + 0.22, 0.08, depth + 0.22], cedar, "roof-fascia", [
    0,
    height - 0.02,
    0,
  ]);
  root.add(roof);

  const wallsGroup = new THREE.Group();
  wallsGroup.name = "walls";
  let usedWidthMm = 0;
  const wallGroups = new Map<string, THREE.Group>();
  const wallById = new Map(configuration.walls.map((item) => [item.id, item]));
  for (const instance of configuration.walls) {
    const wall = findStudioWall(catalog, instance.code);
    if (!wall) continue;
    const x = meters(usedWidthMm + wall.widthMm / 2 - base.widthMm / 2);
    const group = addWall(wallsGroup, wall, instance.id, x, depth, materials);
    wallGroups.set(instance.id, group);
    usedWidthMm += wall.widthMm;
  }
  const sideWallWidth = 0.12;
  box(
    wallsGroup,
    [sideWallWidth, height, depth],
    cedar.clone(),
    "left-side-wall",
    [-width / 2, height / 2 + 0.18, 0],
  );
  box(
    wallsGroup,
    [sideWallWidth, height, depth],
    cedar.clone(),
    "right-side-wall",
    [width / 2, height / 2 + 0.18, 0],
  );
  box(wallsGroup, [width, height, 0.1], cedar.clone(), "rear-wall", [
    0,
    height / 2 + 0.18,
    -depth / 2,
  ]);
  root.add(wallsGroup);

  const accessoryGroup = new THREE.Group();
  accessoryGroup.name = "accessories";
  for (const accessory of configuration.accessories) {
    const targetInstance = wallById.get(accessory.targetWallId);
    const targetGroup = wallGroups.get(accessory.targetWallId);
    const targetWall = targetInstance
      ? findStudioWall(catalog, targetInstance.code)
      : undefined;
    if (targetGroup && targetWall)
      addAccessory(
        accessoryGroup,
        accessory,
        targetGroup,
        targetWall,
        materials,
      );
  }
  root.add(accessoryGroup);

  const analysis = new THREE.Group();
  analysis.name = "analysis";
  analysis.visible = false;
  analysis.userData = {
    dimensions: {
      widthMm: base.widthMm,
      depthMm: base.depthMm,
      heightMm: base.heightMm,
    },
    usedWidthMm,
    material: "cedar / graphite / glass / mineral",
  };
  root.add(analysis);

  root.userData.mobup = Object.freeze({
    baseCode: configuration.baseCode,
    widthMm: base.widthMm,
    depthMm: base.depthMm,
    heightMm: base.heightMm,
    usedWidthMm,
    wallIds: Object.freeze(configuration.walls.map((wall) => wall.id)),
    accessoryIds: Object.freeze(
      configuration.accessories.map((item) => item.id),
    ),
  });
  root.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return root;
}
