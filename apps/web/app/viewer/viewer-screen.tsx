"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type HotspotKey = "structure" | "glass" | "base";

const hotspotCopy: Record<
  HotspotKey,
  { label: string; title: string; body: string }
> = {
  structure: {
    label: "Frame system",
    title: "Powder-coated frame",
    body: "Slim profiles keep the object quiet while carrying the full glass span.",
  },
  glass: {
    label: "Glass panel",
    title: "Low-iron glass panel",
    body: "A translucent surface keeps the scene open and lets the material do the talking.",
  },
  base: {
    label: "Base rail",
    title: "Continuous base rail",
    body: "The lower rail anchors the module and gives the viewer a clear construction line.",
  },
};

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createGlassModule() {
  const model = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: "#283238",
    metalness: 0.55,
    roughness: 0.28,
  });
  const warmFrameMaterial = new THREE.MeshStandardMaterial({
    color: "#c56b4e",
    metalness: 0.35,
    roughness: 0.34,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#c5e1df",
    metalness: 0.05,
    roughness: 0.12,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#c8c7c2",
    roughness: 0.78,
  });

  const width = 3.3;
  const height = 2.35;
  const thickness = 0.075;
  const rail = 0.11;
  const y = height / 2 + rail;
  addBox(model, [width + rail, rail, 0.25], [0, rail / 2, 0], floorMaterial);
  addBox(
    model,
    [width + rail, rail, 0.11],
    [0, height + rail, 0],
    frameMaterial,
  );
  addBox(
    model,
    [rail, height, 0.11],
    [-(width / 2), height / 2 + rail, 0],
    frameMaterial,
  );
  addBox(
    model,
    [rail, height, 0.11],
    [width / 2, height / 2 + rail, 0],
    frameMaterial,
  );
  addBox(
    model,
    [thickness, height - rail * 1.2, 0.035],
    [0, y, 0.01],
    glassMaterial,
  );

  for (const x of [-width / 2 + 0.02, width / 2 - 0.02]) {
    addBox(
      model,
      [0.07, height - rail * 1.2, 0.13],
      [x, y, -0.015],
      frameMaterial,
    );
  }
  addBox(
    model,
    [0.075, height - rail * 1.2, 0.13],
    [-width / 4, y, -0.02],
    frameMaterial,
  );
  addBox(
    model,
    [0.075, height - rail * 1.2, 0.13],
    [width / 4, y, -0.02],
    warmFrameMaterial,
  );
  addBox(
    model,
    [0.075, height - rail * 1.2, 0.13],
    [0, y, -0.04],
    warmFrameMaterial,
  );

  const handle = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.035, 0.28, 4, 10),
    new THREE.MeshStandardMaterial({
      color: "#f0eee7",
      metalness: 0.55,
      roughness: 0.24,
    }),
  );
  handle.position.set(0.26, 1.12, -0.14);
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  model.add(handle);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8),
    new THREE.MeshStandardMaterial({ color: "#ebe9e3", roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  model.add(ground);

  return model;
}

export function ViewerScreen() {
  const mountRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<HotspotKey>("structure");
  const [autoRotate, setAutoRotate] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e9e7e2");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.35, 2.8, 4.9);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#fffdf8", "#95918a", 2.1);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#fff4dd", 4.2);
    key.position.set(-3.5, 6, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#bfd5d5", 2.2);
    rim.position.set(4, 2.6, -3);
    scene.add(rim);

    const model = createGlassModule();
    model.rotation.y = -0.24;
    scene.add(model);
    modelRef.current = model;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 8;
    controls.minPolarAngle = Math.PI / 3.7;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 1.15, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.42;
    controlsRef.current = controls;

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    setIsReady(true);

    let frame = 0;
    const render = () => {
      frame = window.requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material))
            object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
      modelRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const selected = useMemo(() => hotspotCopy[activeHotspot], [activeHotspot]);

  const resetView = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.reset();
    controls.target.set(0, 1.15, 0);
    controls.update();
  };

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <div className="viewer-brand">
          <span className="viewer-brand-mark">A</span>
          <span>AI Estimate Studio</span>
        </div>
        <div className="viewer-header-center">
          <span>OBJECT / 001</span>
          <span className="viewer-dot" /> <span>LIVE PREVIEW</span>
        </div>
        <a
          className="viewer-header-link"
          href="mailto:hello@ai-estimate.studio"
        >
          Talk to the studio <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="viewer-stage" aria-label="3D object viewer">
        <div className="viewer-canvas" ref={mountRef}>
          {!isReady && (
            <div className="viewer-loading">Preparing object view…</div>
          )}
          <div className="viewer-object-label">
            <span>01</span>
            <strong>
              MODULAR
              <br />
              PARTITION
            </strong>
          </div>
          <div className="viewer-stage-note">
            Drag to orbit
            <br />
            Scroll to zoom
          </div>
          <button
            className="hotspot hotspot-structure"
            type="button"
            onClick={() => setActiveHotspot("structure")}
            aria-label="View frame system details"
          >
            <span>01</span>
          </button>
          <button
            className="hotspot hotspot-glass"
            type="button"
            onClick={() => setActiveHotspot("glass")}
            aria-label="View glass panel details"
          >
            <span>02</span>
          </button>
          <button
            className="hotspot hotspot-base"
            type="button"
            onClick={() => setActiveHotspot("base")}
            aria-label="View base rail details"
          >
            <span>03</span>
          </button>
        </div>

        <aside className="viewer-info-panel">
          <div className="viewer-info-top">
            <span className="viewer-kicker">Object viewer</span>
            <span className="viewer-status">
              <i /> Ready
            </span>
          </div>
          <h1>
            See the object
            <br />
            <em>before it exists.</em>
          </h1>
          <p className="viewer-intro">
            A direct, interactive preview for configurable objects. Rotate the
            assembly, inspect its parts, and move from visual confidence to an
            accurate estimate.
          </p>
          <div className="viewer-divider" />
          <div className="viewer-meta-grid">
            <div>
              <span>MODEL</span>
              <strong>Modular Partition 01</strong>
            </div>
            <div>
              <span>FORMAT</span>
              <strong>Interactive 3D</strong>
            </div>
            <div>
              <span>SCHEMA</span>
              <strong>Object Viewer v1</strong>
            </div>
            <div>
              <span>STATUS</span>
              <strong>Ready to inspect</strong>
            </div>
          </div>
          <div className="viewer-selected-detail">
            <span className="viewer-kicker">Selected detail</span>
            <h2>{selected.title}</h2>
            <p>{selected.body}</p>
          </div>
          <div className="viewer-hotspot-list" aria-label="Object details">
            {(Object.keys(hotspotCopy) as HotspotKey[]).map((key) => (
              <button
                className={
                  activeHotspot === key
                    ? "viewer-hotspot-row is-active"
                    : "viewer-hotspot-row"
                }
                key={key}
                type="button"
                onClick={() => setActiveHotspot(key)}
              >
                <span className="hotspot-number">
                  0{(Object.keys(hotspotCopy) as HotspotKey[]).indexOf(key) + 1}
                </span>
                <span>{hotspotCopy[key].label}</span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <div className="viewer-actions">
            <button
              type="button"
              onClick={() => setAutoRotate((value) => !value)}
              className={autoRotate ? "viewer-action is-on" : "viewer-action"}
            >
              <span className="action-dot" />{" "}
              {autoRotate ? "Auto orbit on" : "Auto orbit off"}
            </button>
            <button type="button" onClick={resetView} className="viewer-action">
              Reset view <span aria-hidden="true">↺</span>
            </button>
          </div>
        </aside>
      </section>

      <footer className="viewer-footer">
        <span>AI Estimate Studio / Visual quotation infrastructure</span>
        <span>Use the viewer first. Decide the rest in context.</span>
      </footer>
    </main>
  );
}
