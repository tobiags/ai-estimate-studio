import { describe, expect, it } from "vitest";
import { objectViewerManifestSchema } from "@ai-estimate-studio/contracts";
import { validateObjectViewerManifest } from "./validation";

const assetId = "00000000-0000-4000-8000-000000000001";
const hotspotId = "00000000-0000-4000-8000-000000000002";

describe("generic object viewer manifest", () => {
  it("accepts a capability-complete manifest", () => {
    const manifest = objectViewerManifestSchema.parse({
      schemaVersion: 1,
      assetId,
      capabilities: ["CAMERA", "HOTSPOTS", "VISIBILITY"],
      nodes: [{ id: "root", mappingKey: "root", visibleByDefault: true }],
      hotspots: [
        {
          id: hotspotId,
          nodeId: "root",
          position: [0, 0, 0],
          normal: [0, 1, 0],
          label: "Detail",
        },
      ],
      actions: [{ type: "SET_VISIBILITY", nodeId: "root", visible: false }],
    });
    expect(validateObjectViewerManifest(manifest)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects invalid references and missing capabilities", () => {
    const manifest = objectViewerManifestSchema.parse({
      schemaVersion: 1,
      assetId,
      capabilities: [],
      nodes: [{ id: "root", mappingKey: "root" }],
      hotspots: [
        {
          id: hotspotId,
          nodeId: "missing",
          position: [0, 0, 0],
          normal: [0, 1, 0],
          label: "Detail",
        },
      ],
      actions: [{ type: "FOCUS_NODE", nodeId: "missing" }],
    });
    const codes = validateObjectViewerManifest(manifest).issues.map(
      (issue) => issue.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "NODE_REFERENCE_NOT_FOUND",
        "CAPABILITY_REQUIRED",
      ]),
    );
  });

  it("rejects unknown fields and duplicate mappings at publication", () => {
    expect(() =>
      objectViewerManifestSchema.parse({
        schemaVersion: 1,
        assetId,
        capabilities: [],
        nodes: [],
        hotspots: [],
        actions: [],
        unsafe: true,
      }),
    ).toThrow();
    const manifest = objectViewerManifestSchema.parse({
      schemaVersion: 1,
      assetId,
      capabilities: [],
      nodes: [
        { id: "a", mappingKey: "same" },
        { id: "b", mappingKey: "same" },
      ],
      hotspots: [],
      actions: [],
    });
    expect(
      validateObjectViewerManifest(manifest).issues.map((issue) => issue.code),
    ).toContain("NODE_MAPPING_CONFLICT");
  });
});
