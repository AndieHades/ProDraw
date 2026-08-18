interface OpacityTile {
  readonly x: number;
  readonly y: number;
  readonly data: Float64Array<ArrayBuffer>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type OpacityVisitor = (x: number, y: number, opacity: number) => void;

export class PixelOpacityAccumulator {
  readonly #width: number;
  readonly #side: number;
  readonly #columns: number;
  #tiles = new Map<number, OpacityTile>();
  #dirty = new Set<number>();

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
        minX: this.#side, minY: this.#side, maxX: -1, maxY: -1 };
      this.#tiles.set(key, tile);
    }
    const localX = x - tile.x, localY = y - tile.y;
    const index = localY * this.#side + localX;
    const before = tile.data[index] ?? 0;
    tile.data[index] = Math.max(before, opacity);
    this.#dirty.add(key);
    tile.minX = Math.min(tile.minX, localX); tile.maxX = Math.max(tile.maxX, localX);
    tile.minY = Math.min(tile.minY, localY); tile.maxY = Math.max(tile.maxY, localY);
  }

  drain(visit: OpacityVisitor): void {
    const tiles = this.#tiles;
    this.#tiles = new Map();
    this.#dirty.clear(); this.visitTiles(tiles.values(), visit);
  }

  clear(): void { this.#tiles.clear(); this.#dirty.clear(); }

  visitDirty(visit: OpacityVisitor): void {
    const dirty = [...this.#dirty]; this.#dirty.clear();
    this.visitTiles(dirty.map((key) => this.#tiles.get(key)).filter(
      (tile): tile is OpacityTile => !!tile), visit);
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
