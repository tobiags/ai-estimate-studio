import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicRoot = existsSync(join(process.cwd(), "public"))
  ? join(process.cwd(), "public")
  : join(process.cwd(), "apps", "web", "public");
const root = join(publicRoot, "assets", "models", "nvidia");

describe("NVIDIA web derivatives", () => {
  for (const asset of [
    "chair_office_amf_black_a01",
    "sofa_soft_b02",
    "furniture_table_coffee_low_a01",
  ]) {
    it(`${asset} is a self-contained, budgeted GLB without duplicate USD instances`, () => {
      const file = readFileSync(join(root, `${asset}.glb`));
      expect(file.toString("ascii", 0, 4)).toBe("glTF");
      expect(file.readUInt32LE(4)).toBe(2);
      expect(file.readUInt32LE(8)).toBe(file.length);
      expect(file.length).toBeLessThan(2_500_000);
      const gltf = JSON.parse(
        file.toString("utf8", 20, 20 + file.readUInt32LE(12)),
      ) as {
        nodes: { mesh?: number }[];
        images: { uri?: string; bufferView?: number }[];
        meshes: { primitives: { indices: number }[] }[];
        accessors: { count: number }[];
      };
      expect(gltf.nodes.filter((node) => node.mesh !== undefined)).toHaveLength(
        1,
      );
      expect(gltf.images.length).toBeGreaterThan(0);
      expect(
        gltf.images.every(
          (image) => !image.uri && image.bufferView !== undefined,
        ),
      ).toBe(true);
      const triangles = gltf.meshes
        .flatMap((mesh) => mesh.primitives)
        .reduce(
          (sum, primitive) =>
            sum + gltf.accessors[primitive.indices]!.count / 3,
          0,
        );
      expect(triangles).toBeLessThan(35_000);
      expect(triangles).toBeGreaterThan(1_000);
    });
  }
  it("ships the source, licence and derivative modification notice", () => {
    const notice = readFileSync(join(root, "ATTRIBUTION.txt"), "utf8");
    expect(notice).toContain("NVIDIA");
    expect(notice).toContain("https://creativecommons.org/licenses/by/4.0/");
    expect(notice).toContain("Modifications");
  });
});
