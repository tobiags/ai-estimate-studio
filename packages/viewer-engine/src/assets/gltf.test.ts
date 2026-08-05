import { describe, expect, it } from "vitest";
import { CancellationController } from "./loader";
import { GltfAssetLoader } from "./gltf";

async function* chunks(values: readonly Uint8Array[]) {
  for (const value of values) yield value;
}

describe("GltfAssetLoader", () => {
  it("reports progress and decodes bounded streamed bytes", async () => {
    const progress: number[] = [];
    const decoder = {
      decode: async (data: ArrayBuffer) => ({
        value: new TextDecoder().decode(data),
        dispose: () => undefined,
      }),
    };
    const loader = new GltfAssetLoader(
      {
        get: async () => ({
          status: 200,
          totalBytes: 3,
          body: chunks([new Uint8Array([65]), new Uint8Array([66, 67])]),
        }),
      },
      decoder,
      3,
    );
    const result = await loader.load({
      assetId: "asset-1",
      url: "/asset.glb",
      signal: new CancellationController().signal,
      onProgress: ({ loaded }) => progress.push(loaded),
    });
    expect(result.value).toBe("ABC");
    expect(progress).toEqual([1, 3]);
  });

  it("rejects oversized and cancelled streams before decoding", async () => {
    const decoder = { decode: async () => ({ value: true, dispose: () => undefined }) };
    const oversized = new GltfAssetLoader(
      {
        get: async () => ({
          status: 200,
          totalBytes: 5,
          body: chunks([new Uint8Array(5)]),
        }),
      },
      decoder,
      4,
    );
    await expect(
      oversized.load({
        assetId: "asset-1",
        url: "/asset.glb",
        signal: new CancellationController().signal,
      }),
    ).rejects.toThrow("byte budget");

    const controller = new CancellationController();
    controller.abort();
    const cancelled = new GltfAssetLoader(
      {
        get: async () => ({
          status: 200,
          body: chunks([new Uint8Array([1])]),
        }),
      },
      decoder,
    );
    await expect(
      cancelled.load({ assetId: "asset-1", url: "/asset.glb", signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
