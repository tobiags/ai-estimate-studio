"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createMobupStudioModel,
  type MobupStudioModel,
  type StudioMaterialSet,
} from "./studio-model";
import type { StudioConfiguration } from "@ai-estimate-studio/domain";
import type { StudioEnvironmentCode } from "../studio/environments";
import {
  createMobupEnvironmentScene,
  disposeMobupEnvironment,
  loadThreeEnvironmentAssets,
} from "./studio-environment";
import { ClayStudioViewer } from "./clay-studio-viewer";

const environmentPath = "/assets/environments/polyhaven-lapa-1k.hdr";
const cedarMapPath = "/assets/studio/materials/cedar/cedar_diff_1k.jpg";
const mineralMapPath = "/assets/studio/materials/mineral/mineral_diff_1k.jpg";
const mineralNormalPath =
  "/assets/studio/materials/mineral/mineral_nor_gl_1k.jpg";
const mineralRoughnessPath =
  "/assets/studio/materials/mineral/mineral_rough_1k.jpg";
const defaultRenderer: "clay" | "three" =
  process.env.NEXT_PUBLIC_STUDIO_RENDERER === "three" ? "three" : "clay";

export const studioViewerCamera = Object.freeze({
  fov: 42,
  near: 0.1,
  far: 100,
  minDistance: 3.8,
  maxDistance: 18,
  maxPixelRatio: 2,
});

export type StudioViewerProps = Readonly<{
  configuration: StudioConfiguration;
  environment?: StudioEnvironmentCode;
  renderer?: "clay" | "three";
  showAnalysis?: boolean;
  resetSignal?: number;
  className?: string;
  style?: CSSProperties;
  onReady?: (ready: boolean) => void;
  onError?: (message: string) => void;
}>;

const publicAssetPath = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

function configureTexture(
  texture: THREE.Texture,
  repeat: [number, number],
  color = false,
): THREE.Texture {
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

async function loadTexture(
  loader: THREE.TextureLoader,
  path: string,
  repeat: [number, number],
  color = false,
): Promise<THREE.Texture | undefined> {
  try {
    const texture = await loader.loadAsync(publicAssetPath(path));
    return configureTexture(texture, repeat, color);
  } catch {
    return undefined;
  }
}

async function loadMaterialSet(): Promise<StudioMaterialSet> {
  const textureLoader = new THREE.TextureLoader();
  const [cedarMap, mineralMap, mineralNormalMap, mineralRoughnessMap] =
    await Promise.all([
      loadTexture(textureLoader, cedarMapPath, [2.2, 2.2], true),
      loadTexture(textureLoader, mineralMapPath, [3.6, 3.6], true),
      loadTexture(textureLoader, mineralNormalPath, [3.6, 3.6]),
      loadTexture(textureLoader, mineralRoughnessPath, [3.6, 3.6]),
    ]);

  return {
    cedar: new THREE.MeshStandardMaterial({
      color: cedarMap ? "#ffffff" : "#8a5133",
      map: cedarMap ?? null,
      roughness: 0.62,
      metalness: 0.04,
    }),
    graphite: new THREE.MeshStandardMaterial({
      color: "#292b2b",
      roughness: 0.26,
      metalness: 0.78,
    }),
    mineral: new THREE.MeshStandardMaterial({
      color: mineralMap ? "#ffffff" : "#a8a39a",
      map: mineralMap ?? null,
      normalMap: mineralNormalMap ?? null,
      roughnessMap: mineralRoughnessMap ?? null,
      roughness: 0.86,
      metalness: 0,
    }),
    grass: new THREE.MeshStandardMaterial({
      color: "#728b62",
      roughness: 0.96,
      metalness: 0,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#b9d0cf",
      metalness: 0.08,
      roughness: 0.12,
      transmission: 0.35,
      transparent: true,
      opacity: 0.48,
      thickness: 0.02,
      side: THREE.DoubleSide,
    }),
  };
}

function disposeMaterial(material: THREE.Material): void {
  const candidate = material as THREE.Material & {
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    roughnessMap?: THREE.Texture;
    aoMap?: THREE.Texture;
  };
  for (const texture of [
    candidate.map,
    candidate.normalMap,
    candidate.roughnessMap,
    candidate.aoMap,
  ]) {
    texture?.dispose();
  }
  material.dispose();
}

export function disposeMobupScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach(disposeMaterial);
  });
}

function disposeMobupModel(model: MobupStudioModel): void {
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

export function setAnalysisVisibility(
  model: MobupStudioModel,
  visible: boolean,
): void {
  const analysis = model.getObjectByName("analysis");
  if (analysis) analysis.visible = visible;
}

function cameraForModel(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  model: THREE.Object3D,
): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 2.8);
  const distance = Math.min(
    studioViewerCamera.maxDistance,
    Math.max(studioViewerCamera.minDistance, radius * 1.7),
  );
  const target = center.clone();
  target.y -= 0.35;
  camera.position.set(
    center.x + distance * 0.92,
    center.y + distance * 0.58,
    center.z + distance * 0.92,
  );
  camera.near = studioViewerCamera.near;
  camera.far = studioViewerCamera.far;
  camera.lookAt(target.x, target.y, target.z);
  controls.target.copy(target);
  controls.update();
}

function configureLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight("#fffdf7", "#b6b1a8", 1.7));

  const key = new THREE.DirectionalLight("#fff7e6", 3.2);
  key.position.set(5, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(key);

  const fill = new THREE.DirectionalLight("#dcecff", 1.25);
  fill.position.set(-6, 4, -5);
  scene.add(fill);
}

function classNames(...names: Array<string | undefined>): string {
  return names.filter(Boolean).join(" ");
}

function ThreeStudioViewer({
  configuration,
  environment = "garden",
  showAnalysis = false,
  resetSignal = 0,
  className,
  style,
  onReady,
  onError,
}: StudioViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const modelRef = useRef<MobupStudioModel | null>(null);
  const configurationRef = useRef(configuration);
  const environmentRef = useRef(environment);
  const showAnalysisRef = useRef(showAnalysis);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialsRef = useRef<StudioMaterialSet | null>(null);
  const environmentSceneRef = useRef<THREE.Group | null>(null);
  configurationRef.current = configuration;
  environmentRef.current = environment;
  showAnalysisRef.current = showAnalysis;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let model: MobupStudioModel | null = null;
    let environmentScene: THREE.Group | null = null;
    let environment: THREE.Texture | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let materialSet: StudioMaterialSet | null = null;

    const setup = async () => {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch {
        onReady?.(false);
        onError?.("WebGL n’est pas disponible dans ce navigateur.");
        return;
      }

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, studioViewerCamera.maxPixelRatio),
      );
      renderer.setSize(
        container.clientWidth || 1,
        container.clientHeight || 1,
        false,
      );
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      renderer.domElement.className = "studio-viewer__canvas";
      renderer.domElement.setAttribute("aria-label", "Mobup 3D studio viewer");
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      scene = new THREE.Scene();
      scene.background = new THREE.Color("#e9e6df");
      scene.fog = new THREE.Fog("#e9e6df", 14, 35);
      configureLighting(scene);
      sceneRef.current = scene;

      camera = new THREE.PerspectiveCamera(
        studioViewerCamera.fov,
        Math.max(container.clientWidth, 1) /
          Math.max(container.clientHeight, 1),
        studioViewerCamera.near,
        studioViewerCamera.far,
      );
      camera.position.set(7, 4, 7);
      controls = new OrbitControls(camera, renderer.domElement);
      cameraRef.current = camera;
      controlsRef.current = controls;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = studioViewerCamera.minDistance;
      controls.maxDistance = studioViewerCamera.maxDistance;
      controls.minPolarAngle = Math.PI * 0.12;
      controls.maxPolarAngle = Math.PI * 0.49;

      try {
        materialSet = await loadMaterialSet();
        if (!active || !scene || !renderer || !controls || !materialSet) {
          if (materialSet) {
            Object.values(materialSet).forEach((item) => {
              if (item) disposeMaterial(item);
            });
          }
          renderer?.dispose();
          renderer?.domElement.remove();
          return;
        }

        materialsRef.current = materialSet;
        model = createMobupStudioModel(
          configurationRef.current,
          undefined,
          materialSet,
        );
        modelRef.current = model;
        environmentScene = createMobupEnvironmentScene(
          environmentRef.current,
          materialSet,
        );
        environmentSceneRef.current = environmentScene;
        scene.add(environmentScene);
        await loadThreeEnvironmentAssets(
          environmentScene,
          environmentRef.current,
        );
        scene.add(model);
        setAnalysisVisibility(model, showAnalysisRef.current);
        cameraForModel(camera, controls, model);
        resetRef.current = () => {
          if (cameraRef.current && controlsRef.current && modelRef.current) {
            cameraForModel(
              cameraRef.current,
              controlsRef.current,
              modelRef.current,
            );
          }
        };

        try {
          pmrem = new THREE.PMREMGenerator(renderer);
          const hdr = await new HDRLoader().loadAsync(
            publicAssetPath(environmentPath),
          );
          if (active) {
            environment = pmrem.fromEquirectangular(hdr).texture;
            scene.environment = environment;
            hdr.dispose();
          } else {
            hdr.dispose();
          }
        } catch {
          // The neutral studio light remains a valid fallback when the HDR asset is unavailable.
        }

        onReady?.(true);
      } catch (error) {
        onReady?.(false);
        onError?.(
          error instanceof Error
            ? error.message
            : "Le modèle 3D n’a pas pu être chargé.",
        );
        return;
      }

      const resize = () => {
        if (!renderer || !scene) return;
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        camera!.aspect = width / height;
        camera!.updateProjectionMatrix();
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, studioViewerCamera.maxPixelRatio),
        );
        renderer.setSize(width, height, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const render = () => {
        if (!active || !renderer || !scene || !controls) return;
        frame = window.requestAnimationFrame(render);
        controls.update();
        renderer.render(scene, camera!);
      };
      render();
    };

    void setup();

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      resetRef.current = null;
      if (model) {
        scene?.remove(model);
        disposeMobupModel(model);
      }
      const currentEnvironmentScene =
        environmentSceneRef.current ?? environmentScene;
      if (currentEnvironmentScene) {
        scene?.remove(currentEnvironmentScene);
        disposeMobupEnvironment(currentEnvironmentScene);
        environmentSceneRef.current = null;
      }
      if (modelRef.current === model) modelRef.current = null;
      if (scene) {
        if (environment) environment.dispose();
      }
      pmrem?.dispose();
      controls?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      if (sceneRef.current === scene) sceneRef.current = null;
      if (cameraRef.current === camera) cameraRef.current = null;
      if (controlsRef.current === controls) controlsRef.current = null;
      if (rendererRef.current === renderer) rendererRef.current = null;
      if (materialsRef.current === materialSet) {
        if (materialSet) Object.values(materialSet).forEach(disposeMaterial);
        materialsRef.current = null;
      }
    };
  }, [onError, onReady]);

  useEffect(() => {
    const scene = sceneRef.current;
    const materialSet = materialsRef.current;
    if (!scene || !materialSet) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      disposeMobupModel(modelRef.current);
      modelRef.current = null;
    }
    if (environmentSceneRef.current) {
      scene.remove(environmentSceneRef.current);
      disposeMobupEnvironment(environmentSceneRef.current);
      environmentSceneRef.current = null;
    }
    const nextEnvironment = createMobupEnvironmentScene(
      environment,
      materialSet,
    );
    environmentSceneRef.current = nextEnvironment;
    scene.add(nextEnvironment);
    void loadThreeEnvironmentAssets(nextEnvironment, environment).catch(() => {
      // The procedural terrain remains a complete fallback when a GLB asset
      // cannot be fetched from a static deployment.
    });
    const model = createMobupStudioModel(configuration, undefined, materialSet);
    modelRef.current = model;
    scene.add(model);
    setAnalysisVisibility(model, showAnalysisRef.current);
  }, [configuration, environment]);

  useEffect(() => {
    resetRef.current?.();
  }, [resetSignal]);

  useEffect(() => {
    if (modelRef.current) setAnalysisVisibility(modelRef.current, showAnalysis);
  }, [showAnalysis]);

  return (
    <div
      ref={containerRef}
      className={classNames("studio-viewer", className)}
      style={style}
      role="img"
      aria-label="Visualisation 3D interactive du studio de jardin Mobup"
    />
  );
}

/**
 * ClayGL is the public renderer for the product scene. The validated
 * Three.js composition remains an explicit fallback so the quote experience
 * stays available when a browser cannot initialise ClayGL.
 */
export function StudioViewer(props: StudioViewerProps) {
  const [queryRenderer, setQueryRenderer] = useState<"clay" | "three" | null>(
    null,
  );
  const [clayFailed, setClayFailed] = useState(false);
  const renderer = props.renderer ?? queryRenderer ?? defaultRenderer;

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("renderer");
    if (value === "clay" || value === "three") setQueryRenderer(value);
  }, []);

  useEffect(() => {
    setClayFailed(false);
  }, [props.configuration, props.environment, renderer]);

  const handleClayReady = useCallback(
    (ready: boolean) => {
      props.onReady?.(ready);
    },
    [props.onReady],
  );
  const handleClayError = useCallback(
    (message: string) => {
      setClayFailed(true);
      props.onError?.(message);
    },
    [props.onError],
  );

  if (renderer === "three" || clayFailed) {
    return <ThreeStudioViewer {...props} />;
  }

  return (
    <ClayStudioViewer
      {...props}
      onReady={handleClayReady}
      onError={handleClayError}
    />
  );
}
