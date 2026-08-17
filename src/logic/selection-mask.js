import { parseKey } from './raster.js';
import {
  clipSelectionRect,
  intersectSelectionRects,
  mergeSelectionBounds,
  partitionSelectionRects,
  pointInSelectionRect,
} from './selection-rects.js';
import { SelectionTiles, selectionTileStats } from './selection-tiles.js';

const rectArea = (rect) => (rect.x1 - rect.x0 + 1) * (rect.y1 - rect.y0 + 1);

export class SelectionMask {
  constructor(width, height, rects = [], complement = false) {
    this.width = width;
    this.height = height;
    this.rects = rects.map((rect) => clipSelectionRect(rect, width, height)).filter(Boolean);
    this.complement = complement;
    this.include = new SelectionTiles(width, height);
    this.exclude = new SelectionTiles(width, height);
    this.kind = 'compact-selection-mask';
    this.revision = 0;
    this.baseRectangles = partitionSelectionRects(this.rects, width, height, complement);
  }

  clone() {
    const output = new SelectionMask(this.width, this.height, this.rects, this.complement);
    output.include = this.include.clone();
    output.exclude = this.exclude.clone();
    output.revision = this.revision;
    return output;
  }

  baseHas(x, y) {
    const covered = this.rects.some((rect) => pointInSelectionRect(rect, x, y));
    return this.complement ? !covered : covered;
  }

  hasXY(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.baseHas(x, y) ? !this.exclude.has(x, y) : this.include.has(x, y);
  }

  has(key) {
    const [x, y] = parseKey(key);
    return this.hasXY(x, y);
  }

  get baseArea() {
    return this.baseRectangles.reduce((area, rect) => area + rectArea(rect), 0);
  }

  get size() {
    return this.baseArea + this.include.size - this.exclude.size;
  }

  forceSelected(x, y) {
    const changed = this.baseHas(x, y) ? this.exclude.delete(x, y) : this.include.add(x, y);
    if (changed) this.revision++;
    return changed;
  }

  forceUnselected(x, y) {
    const changed = this.baseHas(x, y) ? this.exclude.add(x, y) : this.include.delete(x, y);
    if (changed) this.revision++;
    return changed;
  }

  inverted() {
    const output = new SelectionMask(this.width, this.height, this.rects, !this.complement);
    output.include = this.exclude.clone();
    output.exclude = this.include.clone();
    output.revision = this.revision;
    return output;
  }

  countInRect(rect) {
    const clipped = clipSelectionRect(rect, this.width, this.height);
    if (!clipped) return 0;
    let count = 0;
    for (const baseRect of this.baseRectangles) {
      const overlap = intersectSelectionRects(baseRect, clipped);
      if (overlap) count += rectArea(overlap);
    }
    return count + this.include.countInRect(clipped) - this.exclude.countInRect(clipped);
  }

  intersectsRect(rect) {
    return this.countInRect(rect) > 0;
  }

  bounds() {
    if (!this.size) return null;
    let bounds = null;
    for (const rect of this.baseRectangles) bounds = mergeSelectionBounds(bounds, rect);
    return mergeSelectionBounds(bounds, this.include.bounds());
  }

  isPlainRectangle() {
    return !this.complement && this.rects.length === 1 &&
      !this.include.size && !this.exclude.size;
  }

  *points() {
    for (const rect of this.baseRectangles) {
      for (let y = rect.y0; y <= rect.y1; y++) {
        for (let x = rect.x0; x <= rect.x1; x++) {
          if (!this.exclude.has(x, y)) yield [x, y];
        }
      }
    }
    for (const [x, y] of this.include.points()) {
      if (!this.baseHas(x, y)) yield [x, y];
    }
  }

  *[Symbol.iterator]() {
    for (const [x, y] of this.points()) yield x + ',' + y;
  }
}

export const isSelectionMask = (value) => value?.kind === 'compact-selection-mask';

export function rectangleSelectionMask(rect, width, height) {
  return new SelectionMask(width, height, [rect]);
}

export function cellsSelectionMask(cells, width, height) {
  if (isSelectionMask(cells)) return cells.clone();
  const output = new SelectionMask(width, height);
  for (const key of cells || []) {
    const point = Array.isArray(key) ? key : parseKey(key);
    output.forceSelected(point[0], point[1]);
  }
  return output;
}

export function selectionMaskStats(mask) {
  return {
    rects: mask.rects.length,
    complement: mask.complement,
    include: selectionTileStats(mask.include),
    exclude: selectionTileStats(mask.exclude),
  };
}
