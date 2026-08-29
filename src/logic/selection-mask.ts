import type { SelectionPoint, SelectionRect } from "../contracts/selection.ts";
import { clipSelectionRect, intersectSelectionRects, mergeSelectionBounds,
  partitionSelectionRects, pointInSelectionRect } from "./selection-rects.ts";
import { SelectionTiles, selectionTileStats } from "./selection-tiles.ts";

const rectArea = (rect: SelectionRect): number =>
  (rect.x1 - rect.x0 + 1) * (rect.y1 - rect.y0 + 1);
const parsePoint = (key: string): SelectionPoint => {
  const separator = key.indexOf(",");
  return [Number(key.slice(0, separator)), Number(key.slice(separator + 1))];
};

export class SelectionMask implements Iterable<string> {
  readonly width: number;
  readonly height: number;
  readonly rects: SelectionRect[];
  readonly complement: boolean;
  include: SelectionTiles;
  exclude: SelectionTiles;
  readonly kind = "compact-selection-mask";
  revision = 0;
  readonly baseRectangles: SelectionRect[];

  constructor(width: number, height: number, rects: readonly SelectionRect[] = [],
    complement = false) {
    this.width = width; this.height = height;
    this.rects = rects.map((rect) => clipSelectionRect(rect, width, height))
      .filter((rect): rect is SelectionRect => rect !== null);
    this.complement = complement;
    this.include = new SelectionTiles(width, height);
    this.exclude = new SelectionTiles(width, height);
    this.baseRectangles = partitionSelectionRects(this.rects, width, height, complement);
  }

  clone(): SelectionMask {
    const output = new SelectionMask(this.width, this.height, this.rects, this.complement);
    output.include = this.include.clone(); output.exclude = this.exclude.clone();
    output.revision = this.revision; return output;
  }

  baseHas(x: number, y: number): boolean {
    const covered = this.rects.some((rect) => pointInSelectionRect(rect, x, y));
    return this.complement ? !covered : covered;
  }

  hasXY(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.baseHas(x, y) ? !this.exclude.has(x, y) : this.include.has(x, y);
  }
  has(key: string): boolean { const [x, y] = parsePoint(key); return this.hasXY(x, y); }
  get baseArea(): number {
    return this.baseRectangles.reduce((area, rect) => area + rectArea(rect), 0);
  }
  get size(): number { return this.baseArea + this.include.size - this.exclude.size; }

  forceSelected(x: number, y: number): boolean {
    const changed = this.baseHas(x, y) ? this.exclude.delete(x, y) : this.include.add(x, y);
    if (changed) this.revision += 1; return changed;
  }
  forceUnselected(x: number, y: number): boolean {
    const changed = this.baseHas(x, y) ? this.exclude.add(x, y) : this.include.delete(x, y);
    if (changed) this.revision += 1; return changed;
  }

  inverted(): SelectionMask {
    const output = new SelectionMask(this.width, this.height, this.rects,
      !this.complement);
    output.include = this.exclude.clone(); output.exclude = this.include.clone();
    output.revision = this.revision; return output;
  }

  countInRect(rect: SelectionRect): number {
    const clipped = clipSelectionRect(rect, this.width, this.height); if (!clipped) return 0;
    let count = 0;
    for (const baseRect of this.baseRectangles) {
      const overlap = intersectSelectionRects(baseRect, clipped);
      if (overlap) count += rectArea(overlap);
    }
    return count + this.include.countInRect(clipped) - this.exclude.countInRect(clipped);
  }
  intersectsRect(rect: SelectionRect): boolean { return this.countInRect(rect) > 0; }

  bounds(): SelectionRect | null {
    if (!this.size) return null;
    let bounds: SelectionRect | null = null;
    for (const rect of this.baseRectangles) bounds = mergeSelectionBounds(bounds, rect);
    return mergeSelectionBounds(bounds, this.include.bounds());
  }
  isPlainRectangle(): boolean {
    return !this.complement && this.rects.length === 1 &&
      !this.include.size && !this.exclude.size;
  }

  *points(): Generator<SelectionPoint> {
    for (const rect of this.baseRectangles)
      for (let y = rect.y0; y <= rect.y1; y++)
        for (let x = rect.x0; x <= rect.x1; x++)
          if (!this.exclude.has(x, y)) yield [x, y];
    for (const [x, y] of this.include.points())
      if (!this.baseHas(x, y)) yield [x, y];
  }
  *[Symbol.iterator](): Generator<string> {
    for (const [x, y] of this.points()) yield `${x},${y}`;
  }
}

export const isSelectionMask = (value: unknown): value is SelectionMask =>
  !!value && typeof value === "object" &&
  (value as { readonly kind?: unknown }).kind === "compact-selection-mask";
export const rectangleSelectionMask = (rect: SelectionRect, width: number,
  height: number): SelectionMask => new SelectionMask(width, height, [rect]);

type SelectionCell = string | SelectionPoint;
export function cellsSelectionMask(cells: Iterable<SelectionCell> | SelectionMask | null |
  undefined, width: number, height: number): SelectionMask {
  if (isSelectionMask(cells)) return cells.clone();
  const output = new SelectionMask(width, height);
  for (const key of cells ?? []) {
    const [x, y] = Array.isArray(key) ? key : parsePoint(key as string);
    output.forceSelected(x, y);
  }
  return output;
}

export const selectionMaskStats = (mask: SelectionMask) => ({
  rects: mask.rects.length, complement: mask.complement,
  include: selectionTileStats(mask.include), exclude: selectionTileStats(mask.exclude)
});
