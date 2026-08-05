export type Vector3 = readonly [number, number, number];
export type Bounds = Readonly<{ min: Vector3; max: Vector3 }>;
export type CameraFrame = Readonly<{
  position: Vector3;
  target: Vector3;
  distance: number;
}>;

export interface Disposable {
  dispose(): void;
}

export interface Scene<T> extends Disposable {
  readonly value: T;
}

export interface Renderer<TScene, TFrame> extends Disposable {
  mount(target: unknown): void;
  unmount(): void;
  render(scene: TScene, frame: TFrame): void;
}

export interface CameraController<TFrame> extends Disposable {
  apply(frame: TFrame): void;
}

export function frameBounds(
  bounds: Bounds,
  padding = 1.2,
  verticalFovRadians = Math.PI / 4,
): CameraFrame {
  if (!Number.isFinite(padding) || padding < 1) {
    throw new RangeError("Camera padding must be at least one");
  }
  if (!Number.isFinite(verticalFovRadians) || verticalFovRadians <= 0) {
    throw new RangeError("Camera field of view must be positive");
  }
  const center: Vector3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const radius = Math.max(
    Math.hypot(
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2],
    ) / 2,
    0.001,
  );
  const distance = (radius * padding) / Math.tan(verticalFovRadians / 2);
  return {
    position: [center[0], center[1], center[2] + distance],
    target: center,
    distance,
  };
}

export class SceneRuntime<TScene, TFrame> implements Disposable {
  private scene: Scene<TScene> | undefined;
  private frame: TFrame | undefined;
  private mounted = false;
  private disposed = false;

  constructor(
    private readonly renderer: Renderer<TScene, TFrame>,
    private readonly camera: CameraController<TFrame>,
  ) {}

  mount(target: unknown): void {
    this.assertActive();
    this.renderer.mount(target);
    this.mounted = true;
    this.render();
  }

  replace(scene: Scene<TScene>): void {
    this.assertActive();
    this.scene?.dispose();
    this.scene = scene;
    this.render();
  }

  setCamera(frame: TFrame): void {
    this.assertActive();
    this.frame = frame;
    this.camera.apply(frame);
    this.render();
  }

  unmount(): void {
    if (this.disposed || !this.mounted) return;
    this.renderer.unmount();
    this.mounted = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.unmount();
    this.scene?.dispose();
    this.scene = undefined;
    this.frame = undefined;
    this.renderer.dispose();
    this.camera.dispose();
    this.disposed = true;
  }

  private render(): void {
    if (this.mounted && this.scene && this.frame !== undefined) {
      this.renderer.render(this.scene.value, this.frame);
    }
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("Scene runtime is disposed");
  }
}
