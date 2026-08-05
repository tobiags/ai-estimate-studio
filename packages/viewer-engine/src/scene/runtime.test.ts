import { describe, expect, it, vi } from "vitest";
import { SceneRuntime, frameBounds } from "./runtime";

describe("SceneRuntime", () => {
  it("frames bounds and disposes renderer, camera and scene exactly once", () => {
    const renderer = {
      mount: vi.fn(),
      unmount: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
    const camera = { apply: vi.fn(), dispose: vi.fn() };
    const scene = { value: { id: "scene" }, dispose: vi.fn() };
    const runtime = new SceneRuntime(renderer, camera);
    runtime.mount({ id: "canvas" });
    runtime.replace(scene);
    const frame = frameBounds({ min: [-1, -1, -1], max: [1, 1, 1] });
    runtime.setCamera(frame);
    runtime.dispose();
    runtime.dispose();
    expect(renderer.mount).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(camera.apply).toHaveBeenCalledWith(frame);
    expect(scene.dispose).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(camera.dispose).toHaveBeenCalledOnce();
  });
});
