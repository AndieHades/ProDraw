// Lazy Array backing for the temporary legacy grid bridge. Materialized cells
// are ordinary array properties, so the hot indexed paint path stays native.
const rowRecords = new WeakMap();
const gridRecords = new WeakMap();

function arrayIndex(key, length = Infinity) {
  if (typeof key !== 'string' || key === '') return -1;
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key ? index : -1;
}

function rangeIndex(value, length, fallback) {
  let index = value == null ? fallback : Math.trunc(Number(value) || 0);
  if (index < 0) index = Math.max(0, length + index);
  return Math.min(length, index);
}

function sparseFill(value, start, end) {
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
    if (index >= from && index < to) { const before = this[index]; delete this[index];
      row?.record.onCell?.(index, row.y, before, null); }
  }
  return this;
}

function sparseRowSlice(start, end) {
  const from = rangeIndex(start, this.length, 0);
  const to = Math.max(from, rangeIndex(end, this.length, this.length));
  const out = new Array(to - from).fill(null);
  for (const key of Object.keys(this)) { const x = arrayIndex(key, this.length);
    if (x >= from && x < to) Reflect.defineProperty(out, String(x - from), {
      configurable: true, enumerable: true, writable: true, value: this[x] }); }
  return out;
}

const rowBase = Object.create(Array.prototype);
const rowPrototype = new Proxy(rowBase, {
  get(target, key, receiver) {
    const index = arrayIndex(key, receiver?.length ?? 0);
    if (index >= 0) return null;
    if (key === 'fill') return sparseFill;
    if (key === 'slice') return sparseRowSlice;
    return Reflect.get(target, key, receiver);
  },
  has(target, key) {
    return arrayIndex(key) >= 0 || Reflect.has(target, key);
  },
  set(target, key, value, receiver) {
    const index = arrayIndex(key, receiver?.length ?? 0);
    if (index < 0) return Reflect.set(target, key, value, receiver);
    const row = rowRecords.get(receiver);
    if (value != null) Reflect.defineProperty(receiver, key, { configurable: true,
      enumerable: true, writable: true, value });
    row?.record.onCell?.(index, row.y, null, value == null ? null : value);
    return true;
  },
});

function createRow(record, y) {
  const row = new Array(record.width);
  Object.setPrototypeOf(row, rowPrototype);
  rowRecords.set(row, { record, y }); return row;
}

function sparseGridSlice(start, end) {
  const from = rangeIndex(start, this.length, 0);
  const to = Math.max(from, rangeIndex(end, this.length, this.length));
  const source = gridRecords.get(this), out = createSparseGrid(source.width, to - from);
  for (const key of Object.keys(this)) { const y = arrayIndex(key, this.length);
    if (y >= from && y < to) Reflect.defineProperty(out, String(y - from), {
      configurable: true, enumerable: true, writable: true, value: this[y] }); }
  return out;
}

const gridBase = Object.create(Array.prototype);
const gridPrototype = new Proxy(gridBase, {
  get(target, key, receiver) {
    const record = gridRecords.get(receiver);
    const y = arrayIndex(key, receiver?.length ?? 0);
    if (!record || y < 0) return key === 'slice' && record
      ? sparseGridSlice : Reflect.get(target, key, receiver);
    const row = createRow(record, y);
    Reflect.defineProperty(receiver, key, { configurable: true, enumerable: true,
      writable: true, value: row });
    return row;
  },
  has(target, key) {
    return arrayIndex(key) >= 0 || Reflect.has(target, key);
  },
  set(target, key, value, receiver) {
    const record = gridRecords.get(receiver);
    const y = arrayIndex(key, receiver?.length ?? 0);
    if (!record || y < 0) return Reflect.set(target, key, value, receiver);
    Reflect.defineProperty(receiver, key, { configurable: true, enumerable: true,
      writable: true, value }); record.onRow?.(y); return true;
  },
});

export function createSparseGrid(width, height, hooks = {}) {
  const grid = new Array(height);
  Object.setPrototypeOf(grid, gridPrototype);
  gridRecords.set(grid, { width, height, onCell: hooks.onCell,
    onRow: hooks.onRow });
  return grid;
}

function visitRow(row, y, visit) {
  for (const key of Object.keys(row || [])) {
    const x = arrayIndex(key, row.length), cell = x >= 0 ? row[x] : null;
    if (cell) visit(x, y, cell);
  }
}

export function visitSparseGridCells(grid, visit) {
  if (!gridRecords.has(grid)) return false;
  for (const key of Object.keys(grid)) {
    const y = arrayIndex(key, grid.length); if (y >= 0) visitRow(grid[y], y, visit);
  }
  return true;
}

export function sparseGridShape(grid) {
  const record = gridRecords.get(grid); if (!record) return null;
  let width = record.width;
  for (const key of Object.keys(grid)) { const y = arrayIndex(key, grid.length);
    if (y >= 0) width = Math.max(width, grid[y]?.length || 0); }
  return { width, height: grid.length };
}

export function sparseGridRows(grid) {
  if (!gridRecords.has(grid)) return null; const rows = [];
  for (const key of Object.keys(grid)) { const y = arrayIndex(key, grid.length);
    if (y >= 0) rows.push([y, grid[y]]); }
  return rows;
}
