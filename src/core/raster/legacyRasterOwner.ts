type LegacyGrid = unknown[][] | { readonly length: number };
type LayerRecord = Record<string, unknown>;
interface Dimensions { readonly width: number; readonly height: number }

export class LegacyRasterOwner {
  readonly id: string;
  #grid: LegacyGrid | null;
  #load: (() => unknown) | null;
  readonly #size: Dimensions;

  constructor(id: string, grid: LegacyGrid | null,
    load: (() => unknown) | null, size: Dimensions) {
    this.id = id; this.#grid = grid; this.#load = load; this.#size = size;
  }

  get grid(): LegacyGrid {
    if (!this.#grid) { this.#grid = normalizedGrid(this.#load?.(), this.#size);
      this.#load = null; }
    return this.#grid;
  }
  replace(grid: LegacyGrid): void { this.#grid = grid; this.#load = null; }
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
