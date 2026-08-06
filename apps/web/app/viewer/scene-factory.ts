import * as THREE from "three";

export type StudioProduct = "pergola" | "pool" | "garden";
export type FrameFinish = "anthracite" | "sand" | "olive";
export type RoofType = "louvers" | "glass";

export type StudioSceneOptions = Readonly<{
  product: StudioProduct;
  width: number;
  depth: number;
  height: number;
  frame: FrameFinish;
  roof: RoofType;
  glass: boolean;
  led: boolean;
  heater: boolean;
}>;

const frameColors: Record<FrameFinish, string> = {
  anthracite: "#2b3030",
  sand: "#c8b79f",
  olive: "#65715f",
};

function material(
  color: string,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.46,
    metalness: 0.08,
    ...options,
  });
}

function box(
  parent: THREE.Object3D,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  mat: THREE.Material,
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(
  parent: THREE.Object3D,
  name: string,
  radius: number,
  height: number,
  position: [number, number, number],
  mat: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, height, 12),
    mat,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addPlant(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const stem = material("#4d5a45", { roughness: 0.9 });
  const leaf = material("#6f7f5c", { roughness: 0.86 });
  cylinder(
    parent,
    "garden.stem",
    0.025 * scale,
    0.38 * scale,
    [x, 0.2 * scale, z],
    stem,
  );
  for (let index = 0; index < 4; index += 1) {
    const leafMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18 * scale, 1),
      leaf,
    );
    leafMesh.name = "garden.leaf";
    leafMesh.position.set(
      x + Math.cos(index * 1.7) * 0.12 * scale,
      0.38 * scale + Math.sin(index) * 0.13 * scale,
      z + Math.sin(index * 1.7) * 0.12 * scale,
    );
    leafMesh.castShadow = true;
    parent.add(leafMesh);
  }
}

function addTree(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const bark = material("#6a5544", { roughness: 0.92 });
  const canopy = material("#496448", { roughness: 0.9 });
  cylinder(
    parent,
    "garden.tree-trunk",
    0.09 * scale,
    1.25 * scale,
    [x, 0.62 * scale, z],
    bark,
  );
  for (const [dx, dy, dz] of [
    [0, 1.35, 0],
    [-0.28, 1.2, 0.08],
    [0.28, 1.18, -0.1],
  ] as const) {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.42 * scale, 12, 10),
      canopy,
    );
    crown.name = "garden.tree-canopy";
    crown.position.set(x + dx * scale, dy * scale, z + dz * scale);
    crown.castShadow = true;
    parent.add(crown);
  }
}

function addPool(parent: THREE.Object3D, width: number, depth: number) {
  const coping = material("#d4c7b3", { roughness: 0.72 });
  const water = material("#4f9fa6", {
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.82,
  });
  box(
    parent,
    "pool.deck",
    [width + 2.2, 0.08, depth + 1.7],
    [0, 0.02, 1.25],
    coping,
  );
  box(
    parent,
    "pool.water",
    [width * 0.72, 0.04, depth * 0.54],
    [0, 0.17, 1.25],
    water,
  );
  box(
    parent,
    "pool.inner-shadow",
    [width * 0.7, 0.1, depth * 0.52],
    [0, 0.1, 1.25],
    material("#2b777f", { roughness: 0.22 }),
  );
}

function addPergola(parent: THREE.Object3D, options: StudioSceneOptions) {
  const frame = material(frameColors[options.frame], {
    metalness: 0.64,
    roughness: 0.3,
  });
  const glass = material("#dbe8e5", {
    transparent: true,
    opacity: 0.3,
    roughness: 0.08,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const led = new THREE.MeshStandardMaterial({
    color: "#fff6d2",
    emissive: "#f6c87a",
    emissiveIntensity: 2.4,
  });
  const width = options.width;
  const depth = options.depth;
  const height = options.height;
  const post = 0.18;
  const y = height / 2;

  for (const x of [-width / 2 + post / 2, width / 2 - post / 2]) {
    for (const z of [-depth / 2 + post / 2, depth / 2 - post / 2]) {
      box(parent, "pergola.frame.post", [post, height, post], [x, y, z], frame);
    }
  }
  box(
    parent,
    "pergola.frame.front-beam",
    [width, post, post],
    [0, height, -depth / 2],
    frame,
  );
  box(
    parent,
    "pergola.frame.back-beam",
    [width, post, post],
    [0, height, depth / 2],
    frame,
  );
  box(
    parent,
    "pergola.frame.left-beam",
    [post, post, depth],
    [-width / 2, height, 0],
    frame,
  );
  box(
    parent,
    "pergola.frame.right-beam",
    [post, post, depth],
    [width / 2, height, 0],
    frame,
  );

  if (options.roof === "louvers") {
    const slatCount = Math.max(8, Math.round(width * 3));
    const slatGap = width / slatCount;
    for (let index = 0; index < slatCount; index += 1) {
      const x = -width / 2 + slatGap * index + slatGap / 2;
      box(
        parent,
        "pergola.roof.louver",
        [0.085, 0.07, depth - 0.24],
        [x, height - 0.02, 0],
        frame,
        options.glass ? 0.04 : -0.12,
      );
      if (options.led && index % 2 === 0) {
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.034, 10, 8),
          led,
        );
        lamp.name = "pergola.roof.led";
        lamp.position.set(x, height - 0.075, 0);
        parent.add(lamp);
      }
    }
  } else {
    box(
      parent,
      "pergola.roof.glass",
      [width - 0.22, 0.05, depth - 0.22],
      [0, height - 0.02, 0],
      glass,
    );
  }

  if (options.glass) {
    box(
      parent,
      "pergola.screen.glass",
      [width - 0.32, height - 0.34, 0.04],
      [0, (height - 0.34) / 2, -depth / 2 + 0.06],
      glass,
    );
    box(
      parent,
      "pergola.screen.bottom-rail",
      [width - 0.32, 0.07, 0.08],
      [0, 0.12, -depth / 2 + 0.04],
      frame,
    );
  }
  if (options.heater) {
    const heater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20),
      material("#3a3b39", { metalness: 0.55, roughness: 0.28 }),
    );
    heater.name = "pergola.heater";
    heater.position.set(0, height - 0.16, 0);
    heater.rotation.x = Math.PI / 2;
    heater.castShadow = true;
    parent.add(heater);
  }
}

function addGardenContext(parent: THREE.Object3D, options: StudioSceneOptions) {
  const paving = material("#cfc5b4", { roughness: 0.82 });
  box(parent, "garden.patio", [9, 0.08, 7], [0, -0.02, 0], paving);
  addPool(
    parent,
    Math.max(options.width * 0.9, 3.6),
    Math.max(options.depth * 0.76, 2.4),
  );
  for (const [x, z, scale] of [
    [-4.0, -2.1, 1.3],
    [3.9, -1.6, 1.1],
    [-4.2, 2.5, 0.9],
    [4.1, 2.8, 1.2],
  ] as const)
    addTree(parent, x, z, scale);
  for (const [x, z, scale] of [
    [-3.0, -2.8, 1.2],
    [-2.55, -2.9, 0.9],
    [3.05, -2.7, 1.05],
    [3.6, -2.5, 0.8],
    [-3.4, 2.65, 0.9],
    [3.3, 2.8, 0.85],
  ] as const)
    addPlant(parent, x, z, scale);
}

export function createStudioModel(options: StudioSceneOptions) {
  const root = new THREE.Group();
  root.name = `generated.${options.product}`;
  root.userData.sculptRuntime = {
    generator: "img2threejs",
    pipeline: ["reference", "spec", "structural", "material", "interaction"],
    referenceConfidence: "approximate-single-view",
    notes:
      "Procedural environment preview generated from a reference image; hidden geometry remains configurable.",
  };

  addGardenContext(root, options);
  if (options.product === "pergola") {
    addPergola(root, options);
  } else if (options.product === "pool") {
    addPool(root, options.width, options.depth);
    box(
      root,
      "pool.shelter",
      [options.width * 0.72, 0.08, 0.1],
      [0, 0.3, options.depth * 0.2],
      material("#2b3030", { metalness: 0.55, roughness: 0.32 }),
    );
  } else {
    box(
      root,
      "garden.bed",
      [options.width * 0.62, 0.24, options.depth * 0.48],
      [0, 0.12, -0.3],
      material("#786555", { roughness: 0.94 }),
    );
    for (let index = 0; index < 12; index += 1) {
      const x = -options.width * 0.28 + (index % 4) * options.width * 0.18;
      const z = -0.8 + Math.floor(index / 4) * 0.46;
      addPlant(root, x, z, 0.72 + (index % 3) * 0.12);
    }
  }

  root.rotation.y = -0.18;
  return root;
}
