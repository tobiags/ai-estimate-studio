import { z } from "zod";
import { uuidSchema } from "../primitives.js";

export const viewerCapabilities = [
  "CAMERA",
  "HOTSPOTS",
  "ANIMATION",
  "MATERIALS",
  "VISIBILITY",
] as const;
export type ViewerCapability = (typeof viewerCapabilities)[number];

const vector3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
const nodeIdSchema = z.string().regex(/^[A-Za-z0-9_.-]{1,128}$/);

export const viewerNodeSchema = z
  .object({
    id: nodeIdSchema,
    mappingKey: nodeIdSchema,
    visibleByDefault: z.boolean().default(true),
  })
  .strict();

export const viewerHotspotSchema = z
  .object({
    id: uuidSchema,
    nodeId: nodeIdSchema,
    position: vector3Schema,
    normal: vector3Schema,
    label: z.string().min(1).max(200),
    detail: z.string().max(1000).optional(),
    focusDistance: z.number().finite().positive().max(100_000).optional(),
  })
  .strict();

export const viewerActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("SET_VISIBILITY"),
      nodeId: nodeIdSchema,
      visible: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("FOCUS_NODE"), nodeId: nodeIdSchema }).strict(),
  z.object({ type: z.literal("PLAY_ANIMATION"), clip: nodeIdSchema }).strict(),
  z
    .object({
      type: z.literal("SET_MATERIAL"),
      nodeId: nodeIdSchema,
      materialKey: nodeIdSchema,
    })
    .strict(),
]);

export const objectViewerManifestSchema = z
  .object({
    schemaVersion: z.number().int().min(1).max(10),
    assetId: uuidSchema,
    capabilities: z
      .array(z.enum(viewerCapabilities))
      .max(viewerCapabilities.length),
    nodes: z.array(viewerNodeSchema).max(10_000),
    hotspots: z.array(viewerHotspotSchema).max(1_000),
    actions: z.array(viewerActionSchema).max(10_000),
    defaultCamera: z
      .object({
        position: vector3Schema,
        target: vector3Schema,
        fov: z.number().finite().min(1).max(179),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ObjectViewerManifest = z.infer<typeof objectViewerManifestSchema>;
