import type { PackedRgbaRowRecord } from "../../contracts/packedRgbaGrid.ts";
import type { ExtCell, PackedRasterExtRecord } from "../../contracts/packedRasterExt.ts";
export type { ExtCell } from "../../contracts/packedRasterExt.ts";

const point = (key: string): [number, number] => {
  const comma = key.indexOf(",");
  return [+key.slice(0, comma), +key.slice(comma + 1)];
};

// The Map interface belongs to existing pixel commands. Crop, persistence and
// rendering consume spans directly, without allocating keys or cells per pixel.
export class PackedRasterExt extends Map<string, ExtCell> {
  readonly #rows = new Map<number, PackedRgbaRowRecord[]>();
  #pixels = 0;

  addRow(row: PackedRgbaRowRecord): void {
    if (!row.opaquePixels) return;
    const rows = this.#rows.get(row.y) ?? [];
    rows.push({ ...row }); this.#rows.set(row.y, rows); this.#pixels += row.opaquePixels;
  }

  *spans(): IterableIterator<PackedRgbaRowRecord> {
    for (const rows of this.#rows.values()) yield* rows;
  }

  private at(key: string): { row: PackedRgbaRowRecord; offset: number } | null {
    const [x, y] = point(key);
    if (!Number.isInteger(x) || !Number.isInteger(y) || `${x},${y}` !== key) return null;
    for (const row of this.#rows.get(y) ?? []) {
      const offset = (x - row.left) * 4;
      if (offset >= 0 && offset < row.bytes.length && row.bytes[offset + 3])
        return { row, offset };
    }
    return null;
  }

  override get size(): number { return this.#pixels + super.size; }
  override has(key: string): boolean { return super.has(key) || !!this.at(key); }
  override get(key: string): ExtCell | undefined {
    if (super.has(key)) return super.get(key);
    const hit = this.at(key); if (!hit) return undefined;
    return Array.from(hit.row.bytes.subarray(hit.offset, hit.offset + 4));
  }
  override delete(key: string): boolean {
    const hit = this.at(key);
    if (hit) {
      hit.row.bytes.fill(0, hit.offset, hit.offset + 4); this.#pixels--;
      (hit.row as { opaquePixels: number }).opaquePixels--;
    }
    return super.delete(key) || !!hit;
  }
  override set(key: string, cell: ExtCell): this {
    const hit = this.at(key);
    if (hit && (cell[3] ?? 255)) {
      hit.row.bytes.set([cell[0] ?? 0, cell[1] ?? 0, cell[2] ?? 0, cell[3] ?? 255],
        hit.offset);
      return this;
    }
    if (hit) this.delete(key);
    return super.set(key, cell);
  }
  override clear(): void { super.clear(); this.#rows.clear(); this.#pixels = 0; }

  override *entries(): MapIterator<[string, ExtCell]> {
    for (const row of this.spans()) for (let offset = 0; offset < row.bytes.length; offset += 4) {
      if (row.bytes[offset + 3]) yield [`${row.left + offset / 4},${row.y}`,
        Array.from(row.bytes.subarray(offset, offset + 4))];
    }
    yield* super.entries();
  }
  override [Symbol.iterator](): MapIterator<[string, ExtCell]> { return this.entries(); }
  override *keys(): MapIterator<string> { for (const [key] of this) yield key; }
  override *values(): MapIterator<ExtCell> { for (const [, cell] of this) yield cell; }
  override forEach(callback: (value: ExtCell, key: string, map: Map<string, ExtCell>) => void,
    thisArg?: unknown): void {
    for (const [key, value] of this) callback.call(thisArg, value, key, this);
  }
  looseCells(): MapIterator<[string, ExtCell]> { return super.entries(); }

  serialize(): PackedRasterExtRecord {
    return { format: "rgba-ext-rows-v1", rows: [...this.spans()].map((row) =>
      ({ ...row, bytes: row.bytes.slice() })), cells: new Map([...super.entries()]
      .map(([key, cell]) => [key, cell.slice()])) };
  }
}

export function hydrateRasterExt(value: unknown): Map<string, ExtCell> {
  if (value instanceof Map) return value as Map<string, ExtCell>;
  if (value == null) return new Map();
  const record = value as PackedRasterExtRecord | null;
  if (record?.format !== "rgba-ext-rows-v1" || !Array.isArray(record.rows) ||
    !(record.cells instanceof Map)) throw new TypeError("Invalid off-canvas raster record");
  const ext = new PackedRasterExt();
  for (const row of record.rows) ext.addRow(row);
  for (const [key, cell] of record.cells) ext.set(key, cell);
  return ext;
}

export function cloneRasterExt(value: unknown): Map<string, ExtCell> {
  const ext = hydrateRasterExt(value);
  if (ext instanceof PackedRasterExt) return hydrateRasterExt(ext.serialize());
  return new Map([...ext].map(([key, cell]) => [key, cell.slice()]));
}

export function serializeRasterExt(value: unknown): unknown {
  const ext = hydrateRasterExt(value);
  return ext instanceof PackedRasterExt ? ext.serialize() : cloneRasterExt(ext);
}
