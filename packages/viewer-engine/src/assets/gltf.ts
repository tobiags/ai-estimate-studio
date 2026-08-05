import type {
  AssetLoader,
  AssetResource,
  CancellationSignal,
  LoadProgress,
} from "./loader.js";

export type AssetResponse = Readonly<{
  status: number;
  totalBytes?: number;
  body: AsyncIterable<Uint8Array>;
}>;

export interface AssetTransport {
  get(url: string, signal: CancellationSignal): Promise<AssetResponse>;
}

export interface GltfDecoder<T> {
  decode(
    data: ArrayBuffer,
    metadata: Readonly<{ assetId: string; url: string }>,
  ): Promise<AssetResource<T>>;
}

export class GltfAssetLoader<T> implements AssetLoader<T> {
  constructor(
    private readonly transport: AssetTransport,
    private readonly decoder: GltfDecoder<T>,
    private readonly maxBytes = 50 * 1024 * 1024,
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
      throw new RangeError("GLTF byte budget must be a positive integer");
    }
  }

  async load(input: {
    readonly assetId: string;
    readonly url: string;
    readonly signal: CancellationSignal;
    readonly onProgress?: (progress: LoadProgress) => void;
  }): Promise<AssetResource<T>> {
    const response = await this.transport.get(input.url, input.signal);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `GLTF asset request failed with status ${response.status}`,
      );
    }
    if (
      response.totalBytes !== undefined &&
      response.totalBytes > this.maxBytes
    ) {
      throw new Error("GLTF asset exceeds the configured byte budget");
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for await (const chunk of response.body) {
      if (input.signal.aborted) throw abortError();
      loaded += chunk.byteLength;
      if (loaded > this.maxBytes) {
        throw new Error("GLTF asset exceeds the configured byte budget");
      }
      chunks.push(chunk);
      input.onProgress?.({
        loaded,
        ...(response.totalBytes === undefined
          ? {}
          : { total: response.totalBytes }),
      });
    }
    if (input.signal.aborted) throw abortError();

    const data = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return this.decoder.decode(data.buffer, {
      assetId: input.assetId,
      url: input.url,
    });
  }
}

function abortError(): Error {
  const error = new Error("GLTF asset load was aborted");
  error.name = "AbortError";
  return error;
}
