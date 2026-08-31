import type { PackedRgbaBounds,
  PackedRgbaGridRecord } from "../../contracts/packedRgbaGrid.ts";
import { clonePackedRgbaGridRecord,
  isPackedRgbaGridRecord } from "./packedRgbaRecord.ts";
import { PackedRgbaGridState } from "./PackedRgbaGridState.ts";

const states = new WeakMap<object, PackedRgbaGridState>();
const indexOf = (key: PropertyKey, length: number): number => {
  if (typeof key !== "string" || key === "") return -1;
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key ? index : -1;
};

function rowView(state: PackedRgbaGridState, y: number): unknown[] {
  const existing = state.rowViews.get(y); if (existing) return existing;
  const target = new Array(state.width);
  const row = new Proxy(target, {
    get(array, key, receiver) {
      const x = indexOf(key, state.width);
      return x >= 0 ? state.cell(x, y) : Reflect.get(array, key, receiver);
    },
    set(array, key, value, receiver) {
      const x = indexOf(key, state.width);
      if (x < 0) return Reflect.set(array, key, value, receiver);
      state.set(x, y, Array.isArray(value) ? value : null); return true;
    },
    has(array, key) {
      return indexOf(key, state.width) >= 0 || Reflect.has(array, key);
    },
    ownKeys() { return [...state.rowKeys(y), "length"]; },
    getOwnPropertyDescriptor(array, key) {
      const x = indexOf(key, state.width), value = x >= 0 ? state.cell(x, y) : null;
      return value ? { configurable: true, enumerable: true, writable: true, value } :
        Reflect.getOwnPropertyDescriptor(array, key);
    },
    defineProperty(array, key, descriptor) {
      const x = indexOf(key, state.width);
      if (x < 0) return Reflect.defineProperty(array, key, descriptor);
      state.set(x, y, Array.isArray(descriptor.value) ? descriptor.value : null); return true;
    },
    deleteProperty(array, key) {
      const x = indexOf(key, state.width);
      if (x < 0) return Reflect.deleteProperty(array, key);
      state.set(x, y, null); return true;
    },
  });
  state.rowViews.set(y, row); return row;
}

function liveGrid(record: PackedRgbaGridRecord): unknown[] {
  const state = new PackedRgbaGridState(record), target = new Array(record.height);
  const grid = new Proxy(target, {
    get(array, key, receiver) {
      const y = indexOf(key, state.height);
      return y >= 0 ? rowView(state, y) : Reflect.get(array, key, receiver);
    },
    set(array, key, value, receiver) {
      const y = indexOf(key, state.height);
      if (y < 0) return Reflect.set(array, key, value, receiver);
      state.replaceRow(y, Array.isArray(value) ? value : []); return true;
    },
    has(array, key) {
      return indexOf(key, state.height) >= 0 || Reflect.has(array, key);
    },
    ownKeys() { return [...state.rowIndices().map(String), "length"]; },
    getOwnPropertyDescriptor(array, key) {
      const y = indexOf(key, state.height);
      return y >= 0 && state.rows.has(y) ? { configurable: true, enumerable: true,
        writable: true, value: rowView(state, y) } :
        Reflect.getOwnPropertyDescriptor(array, key);
    },
    defineProperty(array, key, descriptor) {
      const y = indexOf(key, state.height);
      if (y < 0) return Reflect.defineProperty(array, key, descriptor);
      state.replaceRow(y, Array.isArray(descriptor.value) ? descriptor.value : []); return true;
    },
    deleteProperty(array, key) {
      const y = indexOf(key, state.height);
      if (y < 0) return Reflect.deleteProperty(array, key);
      state.replaceRow(y, []); return true;
    },
  });
  states.set(grid, state); return grid;
}

export function createPackedRgbaGrid(value: unknown): unknown[] | null {
  if (value && typeof value === "object" && states.has(value)) return value as unknown[];
  return isPackedRgbaGridRecord(value) ? liveGrid(value) : null;
}

export function serializePackedRgbaGrid(value: unknown): PackedRgbaGridRecord | null {
  if (isPackedRgbaGridRecord(value)) return clonePackedRgbaGridRecord(value);
  return value && typeof value === "object" ? states.get(value)?.serialize() ?? null : null;
}

export function clonePackedRgbaGrid(value: unknown): unknown[] | null {
  const record = serializePackedRgbaGrid(value); return record ? liveGrid(record) : null;
}

export function packedRgbaState(value: unknown): PackedRgbaGridState | null {
  return value && typeof value === "object" ? states.get(value) ?? null : null;
}
export const packedRgbaShape = (value: unknown) => {
  const state = packedRgbaState(value); return state ?
    { width: state.width, height: state.height } : null;
};
export const packedRgbaStats = (value: unknown) => packedRgbaState(value)?.stats() ?? null;
export const packedRgbaBounds = (value: unknown) => packedRgbaState(value)?.bounds();
export const packedRgbaBoundsMetadata = (value: unknown) =>
  packedRgbaState(value)?.metadata();
export function setPackedRgbaBounds(value: unknown, bounds: PackedRgbaBounds | null,
  exact = true): boolean {
  const state = packedRgbaState(value); if (!state) return false;
  state.setBounds(bounds, exact); return true;
}
export function notePackedRgbaBounds(value: unknown, bounds: PackedRgbaBounds): boolean {
  const state = packedRgbaState(value); if (!state) return false;
  state.noteBounds(bounds); return true;
}
export function invalidatePackedRgbaBounds(value: unknown): boolean {
  const state = packedRgbaState(value); if (!state) return false;
  state.invalidateBounds(); return true;
}
export function visitPackedRgbaCells(value: unknown,
  visit: (x: number, y: number, cell: number[]) => void): boolean {
  const state = packedRgbaState(value); if (!state) return false;
  for (const y of state.rowIndices()) for (const key of state.rowKeys(y)) {
    const x = Number(key), cell = state.cell(x, y); if (cell) visit(x, y, cell);
  }
  return true;
}
