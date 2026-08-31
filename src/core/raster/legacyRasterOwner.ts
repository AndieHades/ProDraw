import type { TileChangeSet } from "../history/tilePatch.ts";
import { LegacyRasterSurfaceBacking } from "./LegacyRasterSurfaceBacking.ts";
import type { LegacyRasterBounds,
  LegacyRasterRegion } from "./LegacyRasterRegion.ts";
import { createPackedRgbaGrid } from "../../logic/raster/PackedRgbaGrid.ts";

type LegacyGrid = unknown[][] | { readonly length: number };
export type LegacyRasterCell = number[] | null;
type LayerRecord = Record<string, unknown>;
interface Dimensions { readonly width: number; readonly height: number }

export class LegacyRasterOwner {
  readonly id: string;
  #grid: LegacyGrid | null;
  #load: (() => unknown) | null;
  readonly #size: Dimensions;
  readonly #backings = new Map<string, LegacyRasterSurfaceBacking>();
  #active: LegacyRasterSurfaceBacking | null = null;

  constructor(id: string, grid: LegacyGrid | null,
    load: (() => unknown) | null, size: Dimensions) {
    this.id = id; this.#grid = grid; this.#load = load; this.#size = size;
  }

  get grid(): LegacyGrid {
    if (!this.#grid) { this.#grid = normalizedGrid(this.#load?.(), this.#size);
      this.#load = null; }
    return this.#grid;
  }
  replace(grid: LegacyGrid): void { this.#grid = grid; this.#load = null;
    this.invalidateSurface(); }
  getCell(x: number, y: number): LegacyRasterCell {
    const row = (this.grid as unknown[][])[y], value = row?.[x];
    return Array.isArray(value) ? value as number[] : null;
  }
  setCell(x: number, y: number, value: LegacyRasterCell): void {
    const row = (this.grid as unknown[][])[y];
    if (!row) return;
    if (this.#active) this.#active.write(this.grid as unknown[][], x, y, value);
    else row[x] = value;
  }
  beginRasterEdit(label: string, width: number, height: number): boolean {
    if (this.#active) return false;
    const backing = this.backing(width, height);
    if (!backing.begin(label)) return false;
    this.#active = backing; return true;
  }
  commitRasterEdit(): TileChangeSet | null {
    const backing = this.#active; this.#active = null;
    return backing?.commit() ?? null;
  }
  cancelRasterEdit(): boolean {
    const backing = this.#active; this.#active = null;
    return backing?.cancel(this.grid as unknown[][]) ?? false;
  }
  swapRasterEdit(changeSet: TileChangeSet, width: number, height: number): TileChangeSet | null {
    const backing = this.#backings.get(`${width}x${height}`);
    if (!backing || changeSet.patches.some((patch) =>
      patch.surfaceId !== `${this.id}/${width}x${height}`)) return null;
    return backing.swap(this.grid as unknown[][], changeSet);
  }
  invalidateSurface(): void {
    for (const backing of this.#backings.values()) backing.invalidate();
  }
  readRegion(bounds: LegacyRasterBounds, width: number, height: number,
    sourceBounds: LegacyRasterBounds = bounds): LegacyRasterRegion {
    return this.backing(width, height).readRegion(
      this.grid as unknown[][], bounds, sourceBounds);
  }
  private backing(width: number, height: number): LegacyRasterSurfaceBacking {
    const key = `${width}x${height}`; let backing = this.#backings.get(key);
    if (!backing) { backing = new LegacyRasterSurfaceBacking(
      `${this.id}/${key}`, width, height); this.#backings.set(key, backing); }
    return backing;
  }
}

const owners = new WeakMap<object, LegacyRasterOwner>();
const collections = new WeakSet<object>();
let sequence = 0;

const normalizedGrid = (value: unknown, size: Dimensions): LegacyGrid => {
  if (value && typeof value === "object" &&
    Number.isInteger((value as { length?: unknown }).length)) return value as LegacyGrid;
  const grid = new Array(Math.max(1, size.height));
  grid[0] = new Array(Math.max(1, size.width)); return grid;
};

export function normalizeLegacyRasterLayer<T extends LayerRecord>(
  layer: T, width: number, height: number
): T {
  if (owners.has(layer)) return layer;
  const mutable = layer as LayerRecord;
  const packed = createPackedRgbaGrid(mutable.rasterRows);
  if (packed) { delete mutable.rasterRows; mutable.grid = packed; }
  const size = { width, height }, descriptor = Object.getOwnPropertyDescriptor(layer, "grid");
  const stored = descriptor && "value" in descriptor ?
    normalizedGrid(descriptor.value, size) : null;
  const load = descriptor?.get ? () => descriptor.get?.call(layer) : null;
  const owner = new LegacyRasterOwner(`legacy/${++sequence}`, stored, load, size);
  owners.set(layer, owner);
  Object.defineProperty(layer, "grid", { enumerable: true, configurable: true,
    get: () => owner.grid,
    set: (value) => owner.replace(normalizedGrid(value, size)) });
  Object.defineProperty(layer, "rasterOwner", { enumerable: false, configurable: true,
    get: () => owner });
  return layer;
}

const arrayIndex = (key: PropertyKey): number => {
  const value = typeof key === "string" ? Number(key) : -1;
  return Number.isInteger(value) && value >= 0 && String(value) === key ? value : -1;
};

export function createLegacyLayerCollection<T extends LayerRecord>(
  source: readonly T[], currentSize: () => Dimensions
): T[] {
  if (collections.has(source)) return source as T[];
  const normalize = (layer: T) => { const size = currentSize();
    return normalizeLegacyRasterLayer(layer, size.width, size.height); };
  const target = source.map(normalize);
  const handler: ProxyHandler<T[]> = {
    set(array, key, value) { const index = arrayIndex(key);
      return Reflect.set(array, key, index < 0 ? value : normalize(value)); },
    defineProperty(array, key, descriptor) { const index = arrayIndex(key);
      return Reflect.defineProperty(array, key, index < 0 ? descriptor :
        { ...descriptor, value: normalize(descriptor.value) }); }
  };
  const proxy = new Proxy(target, handler); collections.add(proxy); return proxy;
}

export const rasterOwnerForLayer = (layer: object): LegacyRasterOwner | null =>
  owners.get(layer) ?? null;
