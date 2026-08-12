import * as THREE from "../../apps/web/node_modules/three/build/three.module.js";
import { GLTFExporter } from "../../apps/web/node_modules/three/examples/jsm/exporters/GLTFExporter.js";
import { writeFile } from "node:fs/promises";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const scene = new THREE.Scene();
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.08, 8),
  new THREE.MeshStandardMaterial({ color: "#9a8468", roughness: 0.86 }),
);
ground.position.y = 0.04;
scene.add(ground);

new GLTFExporter().parse(
  scene,
  async (result) => {
    await writeFile(
      "apps/web/public/assets/models/cad/cobblestone_ground.glb",
      Buffer.from(result),
    );
  },
  (error) => {
    throw error;
  },
  { binary: true, trs: false, onlyVisible: true },
);
