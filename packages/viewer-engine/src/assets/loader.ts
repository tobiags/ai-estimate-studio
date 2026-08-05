export type LoadProgress = Readonly<{ loaded: number; total?: number }>;
export interface CancellationSignal {
  readonly aborted: boolean;
}
export class CancellationController {
  readonly signal: CancellationSignal = { aborted: false };
  abort(): void {
    (this.signal as { aborted: boolean }).aborted = true;
  }
}

export type AssetResource<T> = Readonly<{ value: T; dispose: () => void }>;

export interface AssetLoader<T> {
  load(
    input: Readonly<{
      assetId: string;
      url: string;
      signal: CancellationSignal;
      onProgress?: (progress: LoadProgress) => void;
    }>,
  ): Promise<AssetResource<T>>;
}

export class AssetCache<T> {
  private readonly entries = new Map<string, AssetResource<T>>();

  constructor(private readonly maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1)
      throw new RangeError("Asset cache size must be positive");
  }

  get(key: string): AssetResource<T> | undefined {
    const resource = this.entries.get(key);
    if (!resource) return undefined;
    this.entries.delete(key);
    this.entries.set(key, resource);
    return resource;
  }

  set(key: string, resource: AssetResource<T>): void {
    const previous = this.entries.get(key);
    if (previous && previous !== resource) previous.dispose();
    this.entries.delete(key);
    this.entries.set(key, resource);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      const evicted = this.entries.get(oldest);
      this.entries.delete(oldest);
      evicted?.dispose();
    }
  }

  clear(): void {
    for (const resource of this.entries.values()) resource.dispose();
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
