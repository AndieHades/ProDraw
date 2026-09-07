// Lazy Array backing for the temporary legacy grid bridge. Materialized cells
// are ordinary array properties, so the hot indexed paint path stays native.
// Строка сетки и её прототип живут в sparse-grid-row ради размера модуля.
import type { GridRecord, SparseGrid, SparseRow } from "./sparse-grid-row.ts";
import { arrayIndex, createRow, gridRecords,
  rangeIndex } from "./sparse-grid-row.ts";
export type { SparseCell, SparseGrid, SparseRow } from "./sparse-grid-row.ts";

export interface SparseGridHooks {
  onCell?: GridRecord["onCell"];
  onRow?: GridRecord["onRow"];
}

function sparseGridSlice(this: SparseGrid, start?: number, end?: number): SparseGrid {
  const from = rangeIndex(start, this.length, 0);
  const to = Math.max(from, rangeIndex(end, this.length, this.length));
  const source = gridRecords.get(this) as GridRecord;
  const out = createSparseGrid(source.width, to - from);
  for (const key of Object.keys(this)) { const y = arrayIndex(key, this.length);
    if (y >= from && y < to) Reflect.defineProperty(out, String(y - from), {
      configurable: true, enumerable: true, writable: true, value: this[y] }); }
  return out;
}

const gridBase = Object.create(Array.prototype) as object;
const gridPrototype = new Proxy(gridBase, {
  get(target, key, receiver: SparseGrid) {
    const record = gridRecords.get(receiver);
    const y = arrayIndex(key, receiver?.length ?? 0);
    if (!record || y < 0) return key === "slice" && record
      ? sparseGridSlice : Reflect.get(target, key, receiver);
    const row = createRow(record, y);
    Reflect.defineProperty(receiver, key, { configurable: true, enumerable: true,
      writable: true, value: row });
    return row;
  },
  has(target, key) { return arrayIndex(key) >= 0 || Reflect.has(target, key); },
  set(target, key, value, receiver: SparseGrid) {
    const record = gridRecords.get(receiver);
    const y = arrayIndex(key, receiver?.length ?? 0);
    if (!record || y < 0) return Reflect.set(target, key, value, receiver);
    Reflect.defineProperty(receiver, key, { configurable: true, enumerable: true,
      writable: true, value }); record.onRow?.(y); return true;
  },
});

export function createSparseGrid(width: number, height: number,
  hooks: SparseGridHooks = {}): SparseGrid {
  const grid = new Array<SparseRow>(height);
  Object.setPrototypeOf(grid, gridPrototype);
  gridRecords.set(grid, { width, height, ...(hooks.onCell ? { onCell: hooks.onCell } : {}),
    ...(hooks.onRow ? { onRow: hooks.onRow } : {}) });
  return grid;
}

type CellVisitor = (x: number, y: number, cell: number[]) => void;

function visitRow(row: SparseRow | undefined, y: number, visit: CellVisitor): void {
  for (const key of Object.keys(row ?? [])) {
    const x = arrayIndex(key, row?.length ?? 0), cell = x >= 0 ? row?.[x] : null;
    if (cell) visit(x, y, cell);
  }
}

export function visitSparseGridCells(grid: unknown, visit: CellVisitor): boolean {
  if (!gridRecords.has(grid as object)) return false;
  const rows = grid as SparseGrid;
  for (const key of Object.keys(rows)) {
    const y = arrayIndex(key, rows.length); if (y >= 0) visitRow(rows[y], y, visit);
  }
  return true;
}

export function sparseGridShape(grid: unknown):
  { width: number; height: number } | null {
  const record = gridRecords.get(grid as object); if (!record) return null;
  const rows = grid as SparseGrid; let width = record.width;
  for (const key of Object.keys(rows)) { const y = arrayIndex(key, rows.length);
    if (y >= 0) width = Math.max(width, rows[y]?.length ?? 0); }
  return { width, height: rows.length };
}

export function sparseGridRows(grid: unknown): [number, SparseRow][] | null {
  if (!gridRecords.has(grid as object)) return null;
  const source = grid as SparseGrid, rows: [number, SparseRow][] = [];
  for (const key of Object.keys(source)) { const y = arrayIndex(key, source.length);
    if (y >= 0) rows.push([y, source[y] as SparseRow]); }
  return rows;
}
