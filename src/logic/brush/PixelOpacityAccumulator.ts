interface OpacityTile {
  readonly x: number;
  readonly y: number;
  readonly data: Float64Array<ArrayBuffer>;
  readonly dirty: Uint8Array<ArrayBuffer>;
  readonly changed: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type OpacityVisitor = (x: number, y: number, opacity: number) => void;
type OpacityTileVisitor = (minX: number, minY: number, maxX: number, maxY: number) => void;

export class PixelOpacityAccumulator {
  readonly #width: number;
  readonly #side: number;
  readonly #columns: number;
  #tiles = new Map<number, OpacityTile>();
  #dirtyTiles = new Set<number>();

  constructor(width: number, side: number) {
    this.#width = width;
    this.#side = side;
    this.#columns = Math.ceil(width / side);
  }

  get size(): number {
    return this.#tiles.size;
  }

  add(x: number, y: number, opacity: number): void {
    const tileX = Math.floor(x / this.#side);
    const tileY = Math.floor(y / this.#side);
    const key = tileY * this.#columns + tileX;
    let tile = this.#tiles.get(key);
    if (!tile) {
      tile = { x: tileX * this.#side, y: tileY * this.#side,
        data: new Float64Array(this.#side * this.#side),
        dirty: new Uint8Array(this.#side * this.#side), changed: [],
        minX: this.#side, minY: this.#side, maxX: -1, maxY: -1 };
      this.#tiles.set(key, tile);
    }
    const localX = x - tile.x, localY = y - tile.y;
    const index = localY * this.#side + localX;
    const before = tile.data[index] ?? 0;
    if (opacity <= before) return;
    tile.data[index] = opacity;
    if (!tile.dirty[index]) {
      tile.dirty[index] = 1; tile.changed.push(index); this.#dirtyTiles.add(key);
    }
    tile.minX = Math.min(tile.minX, localX); tile.maxX = Math.max(tile.maxX, localX);
    tile.minY = Math.min(tile.minY, localY); tile.maxY = Math.max(tile.maxY, localY);
  }

  drain(visit: OpacityVisitor): void {
    const tiles = this.#tiles;
    this.#tiles = new Map();
    this.#dirtyTiles.clear(); this.visitTiles(tiles.values(), visit);
  }

  clear(): void { this.#tiles.clear(); this.#dirtyTiles.clear(); }

  visitDirty(visit: OpacityVisitor, visitTile?: OpacityTileVisitor): void {
    const dirty = [...this.#dirtyTiles]; this.#dirtyTiles.clear();
    for (const key of dirty) {
      const tile = this.#tiles.get(key);
      if (!tile) continue;
      visitTile?.(tile.x + tile.minX, tile.y + tile.minY,
        tile.x + tile.maxX, tile.y + tile.maxY);
      for (const index of tile.changed) {
        tile.dirty[index] = 0;
        const x = index % this.#side, y = Math.floor(index / this.#side);
        const opacity = tile.data[index] ?? 0;
        if (opacity > 0) visit(tile.x + x, tile.y + y, opacity);
      }
      tile.changed.length = 0;
    }
  }

  private visitTiles(tiles: Iterable<OpacityTile>, visit: OpacityVisitor): void {
    for (const tile of tiles) {
      for (let y = tile.minY; y <= tile.maxY; y += 1) {
        const documentY = tile.y + y;
        for (let x = tile.minX; x <= tile.maxX; x += 1) {
          const documentX = tile.x + x;
          if (documentX >= this.#width) continue;
          const opacity = tile.data[y * this.#side + x] ?? 0;
          if (opacity > 0) visit(documentX, documentY, opacity);
        }
      }
    }
  }
}
