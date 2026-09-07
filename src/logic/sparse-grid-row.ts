// Lazy Array backing for the temporary legacy grid bridge. Materialized cells
// are ordinary array properties, so the hot indexed paint path stays native.
export type SparseCell = number[] | null;
export type SparseRow = SparseCell[];
export type SparseGrid = SparseRow[];

export interface GridRecord {
  readonly width: number; readonly height: number;
  readonly onCell?: (x: number, y: number, before: unknown, after: unknown) => void;
  readonly onRow?: (y: number) => void;
}
interface RowRecord { readonly record: GridRecord; readonly y: number }

const rowRecords = new WeakMap<object, RowRecord>();
export const gridRecords = new WeakMap<object, GridRecord>();

export function arrayIndex(key: PropertyKey, length = Infinity): number {
  if (typeof key !== "string" || key === "") return -1;
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key ? index : -1;
}

export function rangeIndex(value: unknown, length: number, fallback: number): number {
  let index = value == null ? fallback : Math.trunc(Number(value) || 0);
  if (index < 0) index = Math.max(0, length + index);
  return Math.min(length, index);
}

function sparseFill(this: SparseRow, value: SparseCell, start?: number,
  end?: number): SparseRow {
  const from = rangeIndex(start, this.length, 0);
  const to = rangeIndex(end, this.length, this.length);
  const row = rowRecords.get(this);
  if (value != null) {
    Object.setPrototypeOf(this, Array.prototype);
    try { Array.prototype.fill.call(this, value, from, to); }
    finally { Object.setPrototypeOf(this, rowPrototype); }
    if (to > from) { row?.record.onCell?.(from, row.y, null, value);
      row?.record.onCell?.(to - 1, row.y, null, value); }
    return this;
  }
  for (const key of Object.keys(this)) {
    const index = arrayIndex(key, this.length);
    if (index >= from && index < to) { const before = this[index];
      delete this[index]; row?.record.onCell?.(index, row.y, before, null); }
  }
  return this;
}

function sparseRowSlice(this: SparseRow, start?: number, end?: number): SparseRow {
  const from = rangeIndex(start, this.length, 0);
  const to = Math.max(from, rangeIndex(end, this.length, this.length));
  const out = new Array<SparseCell>(to - from).fill(null);
  for (const key of Object.keys(this)) { const x = arrayIndex(key, this.length);
    if (x >= from && x < to) Reflect.defineProperty(out, String(x - from), {
      configurable: true, enumerable: true, writable: true, value: this[x] }); }
  return out;
}

const rowBase = Object.create(Array.prototype) as object;
const rowPrototype = new Proxy(rowBase, {
  get(target, key, receiver: SparseRow) {
    const index = arrayIndex(key, receiver?.length ?? 0);
    if (index >= 0) return null;
    if (key === "fill") return sparseFill;
    if (key === "slice") return sparseRowSlice;
    return Reflect.get(target, key, receiver);
  },
  has(target, key) { return arrayIndex(key) >= 0 || Reflect.has(target, key); },
  set(target, key, value, receiver: SparseRow) {
    const index = arrayIndex(key, receiver?.length ?? 0);
    if (index < 0) return Reflect.set(target, key, value, receiver);
    const row = rowRecords.get(receiver);
    if (value != null) Reflect.defineProperty(receiver, key, { configurable: true,
      enumerable: true, writable: true, value });
    row?.record.onCell?.(index, row.y, null, value == null ? null : value);
    return true;
  },
});

export function createRow(record: GridRecord, y: number): SparseRow {
  const row = new Array<SparseCell>(record.width);
  Object.setPrototypeOf(row, rowPrototype);
  rowRecords.set(row, { record, y }); return row;
}
