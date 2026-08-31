import type { PackedRgbaBounds, PackedRgbaGridRecord,
  PackedRgbaRowRecord } from "../../contracts/packedRgbaGrid.ts";

interface MutableRow {
  left: number;
  bytes: Uint8ClampedArray;
  opaquePixels: number;
}

const copyBounds = (value: PackedRgbaBounds | null): PackedRgbaBounds | null =>
  value ? { ...value } : null;
const alphaOf = (value: readonly number[] | null): number =>
  value ? value[3] ?? 255 : 0;

export class PackedRgbaGridState {
  readonly width: number;
  readonly height: number;
  readonly rows = new Map<number, MutableRow>();
  readonly rowViews = new Map<number, unknown[]>();
  #bounds: PackedRgbaBounds | null;
  #exact = true;
  #opaquePixels: number;

  constructor(record: PackedRgbaGridRecord) {
    this.width = record.width; this.height = record.height;
    this.#bounds = copyBounds(record.bounds); this.#opaquePixels = record.opaquePixels;
    for (const row of record.rows) this.rows.set(row.y, {
      left: row.left, bytes: row.bytes, opaquePixels: row.opaquePixels,
    });
  }

  cell(x: number, y: number): number[] | null {
    const row = this.rows.get(y);
    if (!row || x < row.left || x >= row.left + row.bytes.length / 4) return null;
    const offset = (x - row.left) * 4, alpha = row.bytes[offset + 3] ?? 0;
    return alpha ? [row.bytes[offset] ?? 0, row.bytes[offset + 1] ?? 0,
      row.bytes[offset + 2] ?? 0, alpha] : null;
  }

  set(x: number, y: number, value: readonly number[] | null): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const before = this.cell(x, y), beforeAlpha = alphaOf(before), afterAlpha = alphaOf(value);
    let row = this.rows.get(y);
    if (!row && !afterAlpha) return;
    if (!row) { row = { left: x, bytes: new Uint8ClampedArray(4), opaquePixels: 0 };
      this.rows.set(y, row); }
    const right = row.left + row.bytes.length / 4 - 1;
    if (x < row.left || x > right) {
      const left = Math.min(x, row.left), nextRight = Math.max(x, right);
      const bytes = new Uint8ClampedArray((nextRight - left + 1) * 4);
      bytes.set(row.bytes, (row.left - left) * 4); row.left = left; row.bytes = bytes;
    }
    const offset = (x - row.left) * 4;
    for (let channel = 0; channel < 4; channel++) row.bytes[offset + channel] =
      value ? value[channel] ?? (channel === 3 ? 255 : 0) : 0;
    if (!beforeAlpha && afterAlpha) { row.opaquePixels++; this.#opaquePixels++;
      this.include(x, y); }
    if (beforeAlpha && !afterAlpha) { row.opaquePixels--; this.#opaquePixels--;
      if (!row.opaquePixels) this.rows.delete(y);
      if (this.#bounds && (x === this.#bounds.minx || x === this.#bounds.maxx ||
        y === this.#bounds.miny || y === this.#bounds.maxy)) this.#exact = false; }
  }

  replaceRow(y: number, source: unknown[]): void {
    if (y < 0 || y >= this.height) return;
    const bytes = new Uint8ClampedArray(this.width * 4);
    let left = this.width, right = -1, opaquePixels = 0;
    for (let x = 0; x < this.width; x++) {
      const value = source[x]; if (!Array.isArray(value) || !alphaOf(value)) continue;
      const offset = x * 4;
      for (let channel = 0; channel < 4; channel++) bytes[offset + channel] =
        value[channel] ?? (channel === 3 ? 255 : 0);
      left = Math.min(left, x); right = x; opaquePixels++;
    }
    const previous = this.rows.get(y)?.opaquePixels ?? 0;
    this.#opaquePixels += opaquePixels - previous;
    if (right < left) this.rows.delete(y); else this.rows.set(y, { left,
      bytes: bytes.slice(left * 4, (right + 1) * 4), opaquePixels });
    this.#exact = false;
  }

  rowKeys(y: number): string[] {
    const row = this.rows.get(y); if (!row) return [];
    const keys: string[] = [];
    for (let index = 0; index < row.bytes.length / 4; index++)
      if (row.bytes[index * 4 + 3]) keys.push(String(row.left + index));
    return keys;
  }
  rowIndices(): number[] { return [...this.rows.keys()].sort((a, b) => a - b); }

  copySpan(y: number, left: number, width: number, target: Uint8ClampedArray,
    targetOffset: number): void {
    const row = this.rows.get(y); if (!row) return;
    const start = Math.max(left, row.left);
    const end = Math.min(left + width, row.left + row.bytes.length / 4);
    if (end <= start) return;
    const sourceOffset = (start - row.left) * 4;
    target.set(row.bytes.subarray(sourceOffset, sourceOffset + (end - start) * 4),
      targetOffset + (start - left) * 4);
  }

  replaceSpan(y: number, left: number, bytes: Uint8ClampedArray): void {
    for (let index = 0; index < bytes.length / 4; index++) {
      const offset = index * 4, alpha = bytes[offset + 3] ?? 0;
      this.set(left + index, y, alpha ? [bytes[offset] ?? 0, bytes[offset + 1] ?? 0,
        bytes[offset + 2] ?? 0, alpha] : null);
    }
  }

  serialize(): PackedRgbaGridRecord {
    const rows: PackedRgbaRowRecord[] = this.rowIndices().map((y) => {
      const row = this.rows.get(y)!;
      return { y, left: row.left, bytes: row.bytes.slice(),
        opaquePixels: row.opaquePixels };
    });
    return { format: "rgba-rows-v1", width: this.width, height: this.height,
      rows, bounds: this.bounds(), opaquePixels: this.#opaquePixels };
  }
  stats() { return { width: this.width, height: this.height,
    materializedRows: this.rowViews.size, contentRows: this.rows.size,
    storedCells: this.#opaquePixels, allocatedCells: [...this.rows.values()]
      .reduce((total, row) => total + row.bytes.length / 4, 0) }; }
  metadata() { return { bounds: copyBounds(this.#bounds), exact: this.#exact }; }
  setBounds(bounds: PackedRgbaBounds | null, exact = true): void {
    this.#bounds = copyBounds(bounds); this.#exact = exact;
  }
  noteBounds(bounds: PackedRgbaBounds): void { this.#bounds = this.#bounds ? {
    minx: Math.min(this.#bounds.minx, bounds.minx),
    miny: Math.min(this.#bounds.miny, bounds.miny),
    maxx: Math.max(this.#bounds.maxx, bounds.maxx),
    maxy: Math.max(this.#bounds.maxy, bounds.maxy) } : copyBounds(bounds);
    this.#exact = false; }
  invalidateBounds(): void { this.#exact = false; }

  bounds(): PackedRgbaBounds | null {
    if (this.#exact) return copyBounds(this.#bounds);
    let minx = this.width, miny = this.height, maxx = -1, maxy = -1;
    for (const y of this.rowIndices()) for (const key of this.rowKeys(y)) {
      const x = Number(key); minx = Math.min(minx, x); miny = Math.min(miny, y);
      maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); }
    this.#bounds = maxx < 0 ? null : { minx, miny, maxx, maxy };
    this.#exact = true; return copyBounds(this.#bounds);
  }

  private include(x: number, y: number): void {
    this.#bounds = this.#bounds ? { minx: Math.min(this.#bounds.minx, x),
      miny: Math.min(this.#bounds.miny, y), maxx: Math.max(this.#bounds.maxx, x),
      maxy: Math.max(this.#bounds.maxy, y) } : { minx: x, miny: y, maxx: x, maxy: y };
  }
}
