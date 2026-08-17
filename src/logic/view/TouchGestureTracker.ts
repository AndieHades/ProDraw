import type { PixelCoordinate } from "../../contracts/raster";
import type { ViewState } from "../../contracts/view";
import { rotateViewAt, zoomViewAt } from "./viewTransform";

interface GesturePair {
  readonly ids: readonly [number, number];
  readonly center: PixelCoordinate;
  readonly distance: number;
  readonly angle: number;
}

const center = (left: PixelCoordinate, right: PixelCoordinate): PixelCoordinate =>
  ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });

export class TouchGestureTracker {
  readonly #points = new Map<number, PixelCoordinate>();
  #previous: GesturePair | null = null;

  get pointerCount(): number { return this.#points.size; }
  has(pointerId: number): boolean { return this.#points.has(pointerId); }

  down(pointerId: number, point: PixelCoordinate): void {
    this.#points.set(pointerId, point);
    this.#previous = this.pair();
  }

  move(pointerId: number, point: PixelCoordinate, view: ViewState): ViewState | null {
    if (!this.#points.has(pointerId)) return null;
    this.#points.set(pointerId, point);
    const current = this.pair();
    const previous = this.#previous;
    this.#previous = current;
    if (!current || !previous || current.ids[0] !== previous.ids[0] ||
      current.ids[1] !== previous.ids[1]) return null;
    const factor = previous.distance > 0 ? current.distance / previous.distance : 1;
    let changed = zoomViewAt(view, previous.center, factor);
    changed = rotateViewAt(changed, previous.center, current.angle - previous.angle);
    return { ...changed,
      offsetX: changed.offsetX + current.center.x - previous.center.x,
      offsetY: changed.offsetY + current.center.y - previous.center.y };
  }

  up(pointerId: number): void {
    this.#points.delete(pointerId);
    this.#previous = this.pair();
  }

  reset(): void { this.#points.clear(); this.#previous = null; }

  private pair(): GesturePair | null {
    const ids = [...this.#points.keys()].sort((left, right) => left - right);
    if (ids.length < 2) return null;
    const selected = [ids[0]!, ids[1]!] as const;
    const left = this.#points.get(selected[0])!;
    const right = this.#points.get(selected[1])!;
    return { ids: selected, center: center(left, right),
      distance: Math.max(0.001, Math.hypot(right.x - left.x, right.y - left.y)),
      angle: Math.atan2(right.y - left.y, right.x - left.x) };
  }
}
