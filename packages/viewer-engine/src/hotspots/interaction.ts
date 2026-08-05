export type ScreenPoint = Readonly<{ x: number; y: number }>;
export type ScreenHotspot = Readonly<{
  id: string;
  label: string;
  detail?: string;
  screen: ScreenPoint;
  visible: boolean;
}>;

export interface ScreenProjector {
  project(world: readonly [number, number, number]): ScreenPoint | null;
}

export class HotspotInteraction {
  private hotspots: readonly ScreenHotspot[] = [];
  private activeId: string | undefined;

  setHotspots(hotspots: readonly ScreenHotspot[]): void {
    this.hotspots = hotspots.filter((hotspot) => hotspot.visible);
    if (
      this.activeId &&
      !this.hotspots.some((hotspot) => hotspot.id === this.activeId)
    ) {
      this.activeId = undefined;
    }
  }

  pick(point: ScreenPoint, radius = 24): ScreenHotspot | undefined {
    const selected = this.hotspots
      .map((hotspot) => ({
        hotspot,
        distance: Math.hypot(
          hotspot.screen.x - point.x,
          hotspot.screen.y - point.y,
        ),
      }))
      .filter(({ distance }) => distance <= radius)
      .sort((left, right) => left.distance - right.distance)[0]?.hotspot;
    this.activeId = selected?.id;
    return selected;
  }

  moveFocus(direction: "next" | "previous"): ScreenHotspot | undefined {
    if (this.hotspots.length === 0) return undefined;
    const current = this.hotspots.findIndex(
      (hotspot) => hotspot.id === this.activeId,
    );
    const offset = direction === "next" ? 1 : -1;
    const nextIndex =
      current < 0
        ? direction === "next"
          ? 0
          : this.hotspots.length - 1
        : (current + offset + this.hotspots.length) % this.hotspots.length;
    const selected = this.hotspots[nextIndex];
    this.activeId = selected?.id;
    return selected;
  }

  get active(): ScreenHotspot | undefined {
    return this.hotspots.find((hotspot) => hotspot.id === this.activeId);
  }
}
