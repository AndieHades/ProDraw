// Sparse 32x32 bit tiles for irregular selection-mask corrections.
const TILE_SIZE = 32;

function pointInside(rect, x, y) {
  return !rect || (x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1);
}

export class SelectionTiles {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.columns = Math.ceil(width / TILE_SIZE);
    this.tiles = new Map();
    this.size = 0;
    this.cachedBounds = null;
    this.boundsDirty = false;
  }

  clone() {
    const output = new SelectionTiles(this.width, this.height);
    for (const [key, words] of this.tiles) output.tiles.set(key, words.slice());
    output.size = this.size;
    output.cachedBounds = this.cachedBounds ? { ...this.cachedBounds } : null;
    output.boundsDirty = this.boundsDirty;
    return output;
  }

  keyAt(x, y) {
    return Math.floor(y / TILE_SIZE) * this.columns + Math.floor(x / TILE_SIZE);
  }

  has(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const words = this.tiles.get(this.keyAt(x, y));
    return !!(words && (words[y & 31] & (1 << (x & 31))));
  }

  add(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const key = this.keyAt(x, y);
    let words = this.tiles.get(key);
    if (!words) {
      words = new Uint32Array(TILE_SIZE);
      this.tiles.set(key, words);
    }
    const row = y & 31;
    const bit = 1 << (x & 31);
    if (words[row] & bit) return false;
    words[row] = (words[row] | bit) >>> 0;
    this.size++;
    this.includeInBounds(x, y);
    return true;
  }

  includeInBounds(x, y) {
    if (!this.cachedBounds) {
      this.cachedBounds = { x0: x, y0: y, x1: x, y1: y };
      return;
    }
    this.cachedBounds.x0 = Math.min(this.cachedBounds.x0, x);
    this.cachedBounds.y0 = Math.min(this.cachedBounds.y0, y);
    this.cachedBounds.x1 = Math.max(this.cachedBounds.x1, x);
    this.cachedBounds.y1 = Math.max(this.cachedBounds.y1, y);
  }

  delete(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const key = this.keyAt(x, y);
    const words = this.tiles.get(key);
    if (!words) return false;
    const row = y & 31;
    const bit = 1 << (x & 31);
    if (!(words[row] & bit)) return false;
    words[row] = (words[row] & ~bit) >>> 0;
    this.size--;
    this.boundsDirty = true;
    if (!words.some(Boolean)) this.tiles.delete(key);
    return true;
  }

  *points() {
    for (const [key, words] of this.tiles) {
      const tileX = (key % this.columns) * TILE_SIZE;
      const tileY = Math.floor(key / this.columns) * TILE_SIZE;
      for (let row = 0; row < TILE_SIZE; row++) {
        let word = words[row] >>> 0;
        while (word) {
          const lowBit = (word & -word) >>> 0;
          const bit = 31 - Math.clz32(lowBit);
          yield [tileX + bit, tileY + row];
          word = (word & (word - 1)) >>> 0;
        }
      }
    }
  }

  forEachPoint(callback) {
    for (const [x, y] of this.points()) callback(x, y);
  }

  countInRect(rect) {
    let count = 0;
    for (const [x, y] of this.points()) if (pointInside(rect, x, y)) count++;
    return count;
  }

  bounds() {
    if (!this.size) return null;
    if (!this.boundsDirty && this.cachedBounds) return { ...this.cachedBounds };
    this.cachedBounds = null;
    this.forEachPoint((x, y) => this.includeInBounds(x, y));
    this.boundsDirty = false;
    return this.cachedBounds ? { ...this.cachedBounds } : null;
  }

  *[Symbol.iterator]() {
    for (const [x, y] of this.points()) yield x + ',' + y;
  }
}

export const selectionTileStats = (tiles) => ({
  tiles: tiles.tiles.size,
  points: tiles.size,
});
