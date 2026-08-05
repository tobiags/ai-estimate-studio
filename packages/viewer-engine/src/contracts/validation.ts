import type { ObjectViewerManifest } from "@ai-estimate-studio/contracts";

export type ViewerValidationIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;
export type ViewerValidationResult = Readonly<{
  valid: boolean;
  issues: readonly ViewerValidationIssue[];
}>;

export const viewerValidationCodes = {
  duplicateNode: "DUPLICATE_NODE_ID",
  duplicateHotspot: "DUPLICATE_HOTSPOT_ID",
  missingNode: "NODE_REFERENCE_NOT_FOUND",
  unsupportedCapability: "CAPABILITY_NOT_DECLARED",
  capabilityRequired: "CAPABILITY_REQUIRED",
  nodeMappingConflict: "NODE_MAPPING_CONFLICT",
} as const;

export function validateObjectViewerManifest(
  manifest: ObjectViewerManifest,
): ViewerValidationResult {
  const issues: ViewerValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const mappings = new Set<string>();
  manifest.nodes.forEach((node, index) => {
    if (nodeIds.has(node.id))
      issues.push({
        code: viewerValidationCodes.duplicateNode,
        path: `nodes[${index}].id`,
        message: `Duplicate node id: ${node.id}`,
      });
    if (mappings.has(node.mappingKey))
      issues.push({
        code: viewerValidationCodes.nodeMappingConflict,
        path: `nodes[${index}].mappingKey`,
        message: `Duplicate mapping key: ${node.mappingKey}`,
      });
    nodeIds.add(node.id);
    mappings.add(node.mappingKey);
  });
  const hotspotIds = new Set<string>();
  manifest.hotspots.forEach((hotspot, index) => {
    if (hotspotIds.has(hotspot.id))
      issues.push({
        code: viewerValidationCodes.duplicateHotspot,
        path: `hotspots[${index}].id`,
        message: `Duplicate hotspot id: ${hotspot.id}`,
      });
    if (!nodeIds.has(hotspot.nodeId))
      issues.push({
        code: viewerValidationCodes.missingNode,
        path: `hotspots[${index}].nodeId`,
        message: "Hotspot references an unknown node",
      });
    hotspotIds.add(hotspot.id);
  });
  manifest.actions.forEach((action, index) => {
    const nodeId = "nodeId" in action ? action.nodeId : undefined;
    if (nodeId && !nodeIds.has(nodeId))
      issues.push({
        code: viewerValidationCodes.missingNode,
        path: `actions[${index}]`,
        message: "Action references an unknown node",
      });
    const requiredCapability =
      action.type === "FOCUS_NODE"
        ? "CAMERA"
        : action.type === "PLAY_ANIMATION"
          ? "ANIMATION"
          : action.type === "SET_MATERIAL"
            ? "MATERIALS"
            : action.type === "SET_VISIBILITY"
              ? "VISIBILITY"
              : undefined;
    if (
      requiredCapability &&
      !manifest.capabilities.includes(requiredCapability)
    )
      issues.push({
        code: viewerValidationCodes.capabilityRequired,
        path: `actions[${index}].type`,
        message: `Action requires capability ${requiredCapability}`,
      });
  });
  if (
    manifest.hotspots.length > 0 &&
    !manifest.capabilities.includes("HOTSPOTS")
  )
    issues.push({
      code: viewerValidationCodes.capabilityRequired,
      path: "hotspots",
      message: "Hotspots require the HOTSPOTS capability",
    });
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
