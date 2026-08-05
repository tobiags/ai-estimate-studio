import type { ObjectViewerManifest } from "@ai-estimate-studio/contracts";

export type ViewerAction = ObjectViewerManifest["actions"][number];
export type MappingConflict = Readonly<{
  nodeId: string;
  property: "visibility" | "material";
  message: string;
}>;

export interface MappingTarget {
  setVisibility(nodeId: string, visible: boolean): void;
  setMaterial(nodeId: string, materialKey: string): void;
  focusNode(nodeId: string): void;
  playAnimation(clip: string): void;
}

export type MappingState = Readonly<{
  visibility: Readonly<Record<string, boolean>>;
  materials: Readonly<Record<string, string>>;
}>;

export function detectMappingConflicts(
  actions: readonly ViewerAction[],
): readonly MappingConflict[] {
  const conflicts: MappingConflict[] = [];
  const seen = new Map<string, string>();
  for (const action of actions) {
    if (action.type !== "SET_VISIBILITY" && action.type !== "SET_MATERIAL") continue;
    const property = action.type === "SET_VISIBILITY" ? "visibility" : "material";
    const key = `${action.nodeId}:${property}`;
    const signature = JSON.stringify(action);
    const previous = seen.get(key);
    if (previous !== undefined && previous !== signature) {
      conflicts.push({
        nodeId: action.nodeId,
        property,
        message: `Conflicting ${property} actions for node ${action.nodeId}`,
      });
    }
    seen.set(key, signature);
  }
  return conflicts;
}

export class MappingController {
  private readonly visibility = new Map<string, boolean>();
  private readonly materials = new Map<string, string>();

  constructor(private readonly target: MappingTarget) {}

  apply(actions: readonly ViewerAction[]): MappingState {
    for (const action of actions) {
      switch (action.type) {
        case "SET_VISIBILITY":
          if (this.visibility.get(action.nodeId) !== action.visible) {
            this.visibility.set(action.nodeId, action.visible);
            this.target.setVisibility(action.nodeId, action.visible);
          }
          break;
        case "SET_MATERIAL":
          if (this.materials.get(action.nodeId) !== action.materialKey) {
            this.materials.set(action.nodeId, action.materialKey);
            this.target.setMaterial(action.nodeId, action.materialKey);
          }
          break;
        case "FOCUS_NODE":
          this.target.focusNode(action.nodeId);
          break;
        case "PLAY_ANIMATION":
          this.target.playAnimation(action.clip);
          break;
      }
    }
    return this.state();
  }

  reset(): void {
    this.visibility.clear();
    this.materials.clear();
  }

  state(): MappingState {
    return {
      visibility: Object.fromEntries(this.visibility),
      materials: Object.fromEntries(this.materials),
    };
  }
}
