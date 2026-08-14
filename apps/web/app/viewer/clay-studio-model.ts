import type { application, Material, Node } from "claygl";
import {
  defaultStudioCatalog,
  findStudioBase,
  findStudioWall,
  type StudioCatalog,
  type StudioConfiguration,
  type StudioWall,
} from "@ai-estimate-studio/domain";
import type { StudioEnvironmentCode } from "../studio/environments";

type ClayApp = application.App3D;

type ClayMaterialSet = Readonly<{
  cedar: Material;
  graphite: Material;
  mineral: Material;
  glass: Material;
  foliage: Material;
  soil: Material;
  water: Material;
}>;

type ClayStudioModel = Readonly<{
  root: Node;
  analysis: Node;
}>;

const meters = (millimetres: number) => millimetres / 1000;

const publicAssetPath = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

function materialSet(app: ClayApp): ClayMaterialSet {
  const cedar = app.createMaterial({
    name: "cedar-pbr",
    shader: "clay.standardMR",
    color: "#a66b46",
    roughness: 0.64,
    metalness: 0.04,
    diffuseMap: publicAssetPath(
      "/assets/studio/materials/cedar/cedar_diff_1k.jpg",
    ),
  });
  const mineral = app.createMaterial({
    name: "mineral-pbr",
    shader: "clay.standardMR",
    color: "#aaa69d",
    roughness: 0.84,
    metalness: 0,
    diffuseMap: publicAssetPath(
      "/assets/studio/materials/mineral/mineral_diff_1k.jpg",
    ),
    normalMap: publicAssetPath(
      "/assets/studio/materials/mineral/mineral_nor_gl_1k.jpg",
    ),
    roughnessMap: publicAssetPath(
      "/assets/studio/materials/mineral/mineral_rough_1k.jpg",
    ),
  });
  const graphite = app.createMaterial({
    name: "graphite-pbr",
    shader: "clay.standardMR",
    color: "#242424",
    roughness: 0.28,
    metalness: 0.78,
  });
  const glass = app.createMaterial({
    name: "glass-pbr",
    shader: "clay.standardMR",
    color: "#c6d8da",
    roughness: 0.12,
    metalness: 0.08,
    alpha: 0.5,
    transparent: true,
  });
  const foliage = app.createMaterial({
    name: "foliage",
    shader: "clay.standardMR",
    color: "#4f754d",
    roughness: 0.94,
    metalness: 0,
  });
  const soil = app.createMaterial({
    name: "soil",
    shader: "clay.standardMR",
    color: "#3f3027",
    roughness: 1,
    metalness: 0,
  });
  const water = app.createMaterial({
    name: "water",
    shader: "clay.standardMR",
    color: "#6aa9b8",
    roughness: 0.14,
    metalness: 0.05,
    alpha: 0.84,
    transparent: true,
  });
  return { cedar, graphite, mineral, glass, foliage, soil, water };
}

function box(
  app: ClayApp,
  parent: Node,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: Material,
): Node {
  const cube = app.createCube(material, parent);
  cube.name = name;
  cube.position.set(...position);
  // ClayGL's cube primitive spans -1..1 on each axis (unlike
  // THREE.BoxGeometry, which receives its final dimensions directly).
  // Halving here keeps the Mobup domain dimensions and camera framing
  // identical across the ClayGL and validated Three.js renderers.
  cube.scale.set(size[0] / 2, size[1] / 2, size[2] / 2);
  cube.castShadow = true;
  cube.receiveShadow = true;
  return cube;
}

function sphere(
  app: ClayApp,
  parent: Node,
  name: string,
  radius: number,
  position: [number, number, number],
  material: Material,
): Node {
  const item = app.createSphere(material, parent, 16);
  item.name = name;
  item.position.set(...position);
  item.scale.set(radius, radius, radius);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function addSolidWall(
  app: ClayApp,
  group: Node,
  wall: StudioWall,
  materials: ClayMaterialSet,
): void {
  const width = meters(wall.widthMm);
  const height = meters(wall.heightMm);
  const spacing = 0.085;
  const count = Math.max(2, Math.ceil(width / spacing));
  const slatWidth = Math.min(0.035, width / count - 0.008);
  for (let index = 0; index < count; index += 1) {
    const x = -width / 2 + (index + 0.5) * (width / count);
    box(
      app,
      group,
      `cladding-slat-${index + 1}`,
      [slatWidth, height - 0.1, 0.08],
      [x, height / 2, 0],
      materials.cedar,
    );
  }
  box(
    app,
    group,
    "wall-bottom-rail",
    [width, 0.11, 0.16],
    [0, 0.055, 0],
    materials.graphite,
  );
  box(
    app,
    group,
    "wall-top-rail",
    [width, 0.11, 0.16],
    [0, height - 0.055, 0],
    materials.graphite,
  );
}

function addGlazedWall(
  app: ClayApp,
  group: Node,
  wall: StudioWall,
  materials: ClayMaterialSet,
): void {
  const width = meters(wall.widthMm);
  const height = meters(wall.heightMm);
  const frame = 0.075;
  const paneWidth = Math.max(0.2, width - frame * 2);
  box(
    app,
    group,
    "glazed-pane",
    [paneWidth, height - frame * 2, 0.025],
    [0, height / 2, 0],
    materials.glass,
  );
  box(
    app,
    group,
    "glazed-bottom-rail",
    [width, frame, 0.14],
    [0, frame / 2, 0],
    materials.graphite,
  );
  box(
    app,
    group,
    "glazed-top-rail",
    [width, frame, 0.14],
    [0, height - frame / 2, 0],
    materials.graphite,
  );
  box(
    app,
    group,
    "glazed-left-frame",
    [frame, height, 0.14],
    [-width / 2 + frame / 2, height / 2, 0],
    materials.graphite,
  );
  box(
    app,
    group,
    "glazed-right-frame",
    [frame, height, 0.14],
    [width / 2 - frame / 2, height / 2, 0],
    materials.graphite,
  );
  const mullions = wall.code === "M8" ? 2 : 1;
  for (let index = 1; index <= mullions; index += 1) {
    const x = -width / 2 + (width * index) / (mullions + 1);
    box(
      app,
      group,
      `glazed-mullion-${index}`,
      [0.045, height - frame * 2, 0.16],
      [x, height / 2, -0.015],
      materials.graphite,
    );
  }
  box(
    app,
    group,
    "glazed-handle",
    [0.12, 0.36, 0.18],
    [width * 0.18, height * 0.5, -0.08],
    materials.graphite,
  );
}

function addOpeningWall(
  app: ClayApp,
  group: Node,
  wall: StudioWall,
  materials: ClayMaterialSet,
): void {
  const width = meters(wall.widthMm);
  const height = meters(wall.heightMm);
  const openingWidth = Math.min(
    width - 0.14,
    meters(wall.innerOpeningWidthMm ?? 0),
  );
  const openingHeight = Math.min(
    height - 0.14,
    meters(wall.innerOpeningHeightMm ?? 0),
  );
  if (openingWidth <= 0 || openingHeight <= 0) {
    addSolidWall(app, group, wall, materials);
    return;
  }
  const sideWidth = Math.max(0.07, (width - openingWidth) / 2);
  const lintelHeight = Math.max(0.07, height - openingHeight);
  box(
    app,
    group,
    "opening-left-panel",
    [sideWidth, openingHeight, 0.1],
    [-(width - sideWidth) / 2, openingHeight / 2, 0],
    materials.cedar,
  );
  box(
    app,
    group,
    "opening-right-panel",
    [sideWidth, openingHeight, 0.1],
    [(width - sideWidth) / 2, openingHeight / 2, 0],
    materials.cedar,
  );
  box(
    app,
    group,
    "opening-lintel",
    [openingWidth, lintelHeight, 0.1],
    [0, openingHeight + lintelHeight / 2, 0],
    materials.cedar,
  );
  box(
    app,
    group,
    "opening-sill",
    [openingWidth, 0.06, 0.14],
    [0, 0.03, -0.03],
    materials.graphite,
  );
  box(
    app,
    group,
    "opening-header",
    [openingWidth, 0.06, 0.14],
    [0, openingHeight, -0.03],
    materials.graphite,
  );
}

function addWall(
  app: ClayApp,
  parent: Node,
  wall: StudioWall,
  id: string,
  x: number,
  depth: number,
  materials: ClayMaterialSet,
): Node {
  const group = app.createNode(parent);
  group.name = `wall-${id}-${wall.code}`;
  group.position.set(x, 0.18, depth / 2);
  if (wall.kind === "GLAZED") addGlazedWall(app, group, wall, materials);
  else if (wall.kind === "OPENING") addOpeningWall(app, group, wall, materials);
  else addSolidWall(app, group, wall, materials);
  return group;
}

function addAccessory(
  app: ClayApp,
  parent: Node,
  accessory: StudioConfiguration["accessories"][number],
  wallGroup: Node,
  wall: StudioWall,
  materials: ClayMaterialSet,
): void {
  const group = app.createNode(parent);
  group.name = `accessory-${accessory.id}-${accessory.code}`;
  const width = accessory.code === "CLAUSTRA" ? 1.25 : 0.8;
  const height = accessory.code === "CLAUSTRA" ? 2.25 : 0.18;
  const wallWidth = meters(wall.widthMm);
  if (accessory.code === "CLAUSTRA") {
    const slats = 9;
    for (let index = 0; index < slats; index += 1) {
      const x = -width / 2 + (index + 0.5) * (width / slats);
      box(
        app,
        group,
        `claustra-slat-${index + 1}`,
        [0.035, height, 0.1],
        [x, height / 2 + 0.12, -0.05],
        materials.cedar,
      );
    }
  } else {
    box(
      app,
      group,
      "canopy-panel",
      [width, 0.16, 0.34],
      [0, height + 0.06, -0.08],
      materials.cedar,
    );
  }
  group.position.copy(wallGroup.position);
  group.position.x += Math.min(
    0.15,
    Math.max(-0.15, wallWidth / 2 - width / 2),
  );
}

function addGarden(app: ClayApp, root: Node, materials: ClayMaterialSet): void {
  box(
    app,
    root,
    "garden-ground",
    [8.8, 0.12, 6.8],
    [0, -0.08, 0],
    materials.foliage,
  );
  box(
    app,
    root,
    "garden-path",
    [5.9, 0.04, 3.7],
    [0, -0.005, 0],
    materials.mineral,
  );
  for (const [index, x, z] of [
    [1, -3.25, -1.65],
    [2, 3.25, 1.65],
  ] as const) {
    box(
      app,
      root,
      `garden-bed-${index}`,
      [1.35, 0.08, 1.8],
      [x, 0.02, z],
      materials.soil,
    );
    sphere(
      app,
      root,
      `garden-shrub-${index}`,
      0.28,
      [x, 0.25, z],
      materials.foliage,
    );
  }
}

function addPool(app: ClayApp, root: Node, materials: ClayMaterialSet): void {
  box(
    app,
    root,
    "pool-deck",
    [8.8, 0.12, 6.8],
    [0, -0.08, 0],
    materials.mineral,
  );
  const poolX = 3.25;
  box(
    app,
    root,
    "pool-water",
    [2.25, 0.055, 4.45],
    [poolX, 0.03, 0],
    materials.water,
  );
  box(
    app,
    root,
    "pool-coping-front",
    [2.45, 0.08, 0.12],
    [poolX, 0.06, -2.28],
    materials.mineral,
  );
  box(
    app,
    root,
    "pool-coping-back",
    [2.45, 0.08, 0.12],
    [poolX, 0.06, 2.28],
    materials.mineral,
  );
  box(
    app,
    root,
    "pool-coping-left",
    [0.12, 0.08, 4.45],
    [poolX - 1.18, 0.06, 0],
    materials.mineral,
  );
  box(
    app,
    root,
    "pool-coping-right",
    [0.12, 0.08, 4.45],
    [poolX + 1.18, 0.06, 0],
    materials.mineral,
  );
}

function addTerrace(
  app: ClayApp,
  root: Node,
  materials: ClayMaterialSet,
): void {
  box(
    app,
    root,
    "terrace-ground",
    [8.8, 0.12, 6.8],
    [0, -0.08, 0],
    materials.mineral,
  );
  box(
    app,
    root,
    "terrace-deck",
    [6.2, 0.08, 3.9],
    [0, 0.02, 0.12],
    materials.cedar,
  );
  for (const [index, x] of [
    [1, -3.25],
    [2, 3.25],
  ] as const) {
    box(
      app,
      root,
      `terrace-planter-${index}`,
      [0.62, 0.52, 0.62],
      [x, 0.28, 1.85],
      materials.cedar,
    );
    sphere(
      app,
      root,
      `terrace-plant-${index}`,
      0.22,
      [x, 0.78, 1.85],
      materials.foliage,
    );
  }
}

export function createClayStudioModel(
  app: ClayApp,
  configuration: StudioConfiguration,
  environment: StudioEnvironmentCode,
  catalog: StudioCatalog = defaultStudioCatalog,
): ClayStudioModel {
  const base = findStudioBase(catalog, configuration.baseCode);
  if (!base) throw new Error(`Unknown studio base: ${configuration.baseCode}`);
  const materials = materialSet(app);
  const root = app.createNode();
  root.name = "mobup-clay-studio-model";
  const width = meters(base.widthMm);
  const depth = meters(base.depthMm);
  const height = meters(base.heightMm);
  box(
    app,
    root,
    "foundation-slab",
    [width, 0.18, depth],
    [0, 0.09, 0],
    materials.mineral,
  );
  box(
    app,
    root,
    "foundation-edge",
    [width + 0.06, 0.12, depth + 0.06],
    [0, 0.02, 0],
    materials.graphite,
  );
  box(
    app,
    root,
    "flat-roof",
    [width + 0.16, 0.18, depth + 0.16],
    [0, height + 0.09, 0],
    materials.graphite,
  );
  box(
    app,
    root,
    "roof-fascia",
    [width + 0.22, 0.08, depth + 0.22],
    [0, height - 0.02, 0],
    materials.cedar,
  );

  const wallsGroup = app.createNode(root);
  wallsGroup.name = "walls";
  let usedWidthMm = 0;
  const wallGroups = new Map<string, Node>();
  const wallById = new Map(configuration.walls.map((item) => [item.id, item]));
  for (const instance of configuration.walls) {
    const wall = findStudioWall(catalog, instance.code);
    if (!wall) continue;
    const x = meters(usedWidthMm + wall.widthMm / 2 - base.widthMm / 2);
    const group = addWall(
      app,
      wallsGroup,
      wall,
      instance.id,
      x,
      depth,
      materials,
    );
    wallGroups.set(instance.id, group);
    usedWidthMm += wall.widthMm;
  }
  box(
    app,
    wallsGroup,
    "left-side-wall",
    [0.12, height, depth],
    [-width / 2, height / 2 + 0.18, 0],
    materials.cedar,
  );
  box(
    app,
    wallsGroup,
    "right-side-wall",
    [0.12, height, depth],
    [width / 2, height / 2 + 0.18, 0],
    materials.cedar,
  );
  box(
    app,
    wallsGroup,
    "rear-wall",
    [width, height, 0.1],
    [0, height / 2 + 0.18, -depth / 2],
    materials.cedar,
  );

  const accessoriesGroup = app.createNode(root);
  accessoriesGroup.name = "accessories";
  for (const accessory of configuration.accessories) {
    const targetInstance = wallById.get(accessory.targetWallId);
    const targetGroup = wallGroups.get(accessory.targetWallId);
    const targetWall = targetInstance
      ? findStudioWall(catalog, targetInstance.code)
      : undefined;
    if (targetGroup && targetWall)
      addAccessory(
        app,
        accessoriesGroup,
        accessory,
        targetGroup,
        targetWall,
        materials,
      );
  }

  const analysis = app.createNode(root);
  analysis.name = "analysis";
  (analysis as Node & { invisible: boolean }).invisible = true;
  box(
    app,
    analysis,
    "analysis-width",
    [width, 0.012, 0.012],
    [0, 0.03, depth / 2 + 0.26],
    materials.graphite,
  );
  box(
    app,
    analysis,
    "analysis-depth",
    [0.012, 0.012, depth],
    [width / 2 + 0.26, 0.03, 0],
    materials.graphite,
  );
  box(
    app,
    analysis,
    "analysis-height",
    [0.012, height, 0.012],
    [width / 2 + 0.26, height / 2, depth / 2 + 0.26],
    materials.graphite,
  );

  if (environment === "pool") addPool(app, root, materials);
  else if (environment === "terrace") addTerrace(app, root, materials);
  else addGarden(app, root, materials);

  return { root, analysis };
}
