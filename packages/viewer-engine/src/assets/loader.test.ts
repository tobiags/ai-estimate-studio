import { describe, expect, it } from "vitest";
import { AssetCache, type AssetLoader } from "./loader";
import { ViewerSession } from "../lifecycle/session";

function resource(value: string, onDispose: () => void) {
  return { value, dispose: onDispose };
}

describe("viewer asset lifecycle", () => {
  it("evicts least recently used resources and disposes them", () => {
    const disposed: string[] = [];
    const cache = new AssetCache<string>(2);
    cache.set(
      "a",
      resource("A", () => disposed.push("A")),
    );
    cache.set(
      "b",
      resource("B", () => disposed.push("B")),
    );
    expect(cache.get("a")?.value).toBe("A");
    cache.set(
      "c",
      resource("C", () => disposed.push("C")),
    );
    expect(cache.get("b")).toBeUndefined();
    expect(disposed).toEqual(["B"]);
    cache.clear();
    expect(disposed).toEqual(["B", "A", "C"]);
  });

  it("replaces assets, aborts stale loads and disposes the session", async () => {
    const disposed: string[] = [];
    const loader: AssetLoader<string> = {
      async load({ assetId, signal }) {
        await new Promise((resolve) =>
          setTimeout(resolve, assetId === "slow" ? 20 : 1),
        );
        if (signal.aborted) {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        }
        return resource(assetId, () => disposed.push(assetId));
      },
    };
    const session = new ViewerSession(loader);
    const slow = session.replace({ assetId: "slow", url: "/slow" });
    await session.replace({ assetId: "fast", url: "/fast" });
    await expect(slow).rejects.toThrow();
    expect(session.value).toBe("fast");
    session.dispose();
    expect(disposed).toEqual(["fast"]);
    expect(session.state).toBe("DISPOSED");
  });
});
