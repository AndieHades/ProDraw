import type { SelectionPoint, SelectionRect } from "../contracts/selection.ts";

const TILE_SIZE = 32;
const pointInside = (rect: SelectionRect | null, x: number, y: number): boolean =>
  !rect || (x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1);

export class SelectionTiles implements Iterable<string> {
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly tiles = new Map<number, Uint32Array>();
  size = 0;
  private cachedBounds: SelectionRect | null = null;
  private boundsDirty = false;

  constructor(width: number, height: number) {
    this.width = width; this.height = height; this.columns = Math.ceil(width / TILE_SIZE);
  }

  clone(): SelectionTiles {
    const output = new SelectionTiles(this.width, this.height);
    for (const [key, words] of this.tiles) output.tiles.set(key, words.slice());
    output.size = this.size;
    output.cachedBounds = this.cachedBounds ? { ...this.cachedBounds } : null;
    output.boundsDirty = this.boundsDirty; return output;
  }

  private keyAt(x: number, y: number): number {
    return Math.floor(y / TILE_SIZE) * this.columns + Math.floor(x / TILE_SIZE);
  }

  has(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const words = this.tiles.get(this.keyAt(x, y));
    return !!(words && ((words[y & 31] ?? 0) & (1 << (x & 31))));
  }

  add(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const key = this.keyAt(x, y); let words = this.tiles.get(key);
    if (!words) { words = new Uint32Array(TILE_SIZE); this.tiles.set(key, words); }
    const row = y & 31, bit = 1 << (x & 31), current = words[row] ?? 0;
    if (current & bit) return false;
    words[row] = (current | bit) >>> 0; this.size += 1; this.includeInBounds(x, y);
    return true;
  }

  private includeInBounds(x: number, y: number): void {
    if (!this.cachedBounds) {
      this.cachedBounds = { x0: x, y0: y, x1: x, y1: y }; return;
    }
    this.cachedBounds.x0 = Math.min(this.cachedBounds.x0, x);
    this.cachedBounds.y0 = Math.min(this.cachedBounds.y0, y);
    this.cachedBounds.x1 = Math.max(this.cachedBounds.x1, x);
    this.cachedBounds.y1 = Math.max(this.cachedBounds.y1, y);
  }

  delete(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const key = this.keyAt(x, y), words = this.tiles.get(key); if (!words) return false;
    const row = y & 31, bit = 1 << (x & 31), current = words[row] ?? 0;
    if (!(current & bit)) return false;
    words[row] = (current & ~bit) >>> 0; this.size -= 1; this.boundsDirty = true;
    if (!words.some(Boolean)) this.tiles.delete(key); return true;
  }

  *points(): Generator<SelectionPoint> {
    for (const [key, words] of this.tiles) {
      const tileX = (key % this.columns) * TILE_SIZE;
      const tileY = Math.floor(key / this.columns) * TILE_SIZE;
      for (let row = 0; row < TILE_SIZE; row++) {
        let word = words[row] ?? 0;
        while (word) {
          const lowBit = (word & -word) >>> 0, bit = 31 - Math.clz32(lowBit);
          yield [tileX + bit, tileY + row]; word = (word & (word - 1)) >>> 0;
        }
      }
    }
  }

  forEachPoint(callback: (x: number, y: number) => void): void {
    for (const [x, y] of this.points()) callback(x, y);
  }

  countInRect(rect: SelectionRect | null): number {
    let count = 0;
    for (const [x, y] of this.points()) if (pointInside(rect, x, y)) count += 1;
    return count;
  }

  bounds(): SelectionRect | null {
    if (!this.size) return null;
    if (!this.boundsDirty && this.cachedBounds) return { ...this.cachedBounds };
    this.cachedBounds = null;
    this.forEachPoint((x, y) => this.includeInBounds(x, y));
    this.boundsDirty = false;
    const bounds = this.cachedBounds as SelectionRect | null;
    return bounds ? { ...bounds } : null;
  }

  *[Symbol.iterator](): Generator<string> {
    for (const [x, y] of this.points()) yield `${x},${y}`;
  }
}

export const selectionTileStats = (tiles: SelectionTiles): {
  readonly tiles: number; readonly points: number } => ({
  tiles: tiles.tiles.size, points: tiles.size
});
