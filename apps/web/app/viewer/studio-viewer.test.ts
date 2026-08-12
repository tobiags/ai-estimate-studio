import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createMobupStudioModel } from "./studio-model";
import {
  disposeMobupScene,
  setAnalysisVisibility,
  studioViewerCamera,
} from "./studio-viewer";
import { defaultStudioConfiguration } from "@ai-estimate-studio/domain";

describe("studio viewer helpers", () => {
  it("exposes a bounded orbit camera contract", () => {
    expect(studioViewerCamera.minDistance).toBeGreaterThan(0);
    expect(studioViewerCamera.maxDistance).toBeGreaterThan(
      studioViewerCamera.minDistance,
    );
    expect(studioViewerCamera.maxPixelRatio).toBe(2);
  });

  it("toggles the analysis layer without changing the model", () => {
    const model = createMobupStudioModel(defaultStudioConfiguration);
    const analysis = model.getObjectByName("analysis");

    expect(analysis?.visible).toBe(false);
    setAnalysisVisibility(model, true);
    expect(analysis?.visible).toBe(true);
    setAnalysisVisibility(model, false);
    expect(analysis?.visible).toBe(false);
  });

  it("disposes mesh resources from a scene", () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    disposeMobupScene(scene);

    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
  });
});
