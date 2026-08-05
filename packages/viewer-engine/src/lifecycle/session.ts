import {
  CancellationController,
  type AssetLoader,
  type AssetResource,
  type LoadProgress,
} from "../assets/loader.js";

export type SessionState = "IDLE" | "LOADING" | "READY" | "DISPOSED";

export class ViewerSession<T> {
  private resource: AssetResource<T> | undefined;
  private controller: CancellationController | undefined;
  private _state: SessionState = "IDLE";

  constructor(private readonly loader: AssetLoader<T>) {}

  get state(): SessionState {
    return this._state;
  }
  get value(): T | undefined {
    return this.resource?.value;
  }

  async replace(
    input: Readonly<{
      assetId: string;
      url: string;
      onProgress?: (progress: LoadProgress) => void;
    }>,
  ): Promise<T> {
    if (this._state === "DISPOSED")
      throw new Error("Viewer session is disposed");
    this.controller?.abort();
    this.resource?.dispose();
    this.resource = undefined;
    const controller = new CancellationController();
    this.controller = controller;
    this._state = "LOADING";
    try {
      const resource = await this.loader.load({
        ...input,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        resource.dispose();
        const error = new Error("Asset load was aborted");
        error.name = "AbortError";
        throw error;
      }
      this.resource = resource;
      this._state = "READY";
      return resource.value;
    } catch (error) {
      if (!this.isDisposed()) this._state = "IDLE";
      throw error;
    }
  }

  dispose(): void {
    if (this._state === "DISPOSED") return;
    this.controller?.abort();
    this.resource?.dispose();
    this.controller = undefined;
    this.resource = undefined;
    this._state = "DISPOSED";
  }

  private isDisposed(): boolean {
    return this._state === "DISPOSED";
  }
}
