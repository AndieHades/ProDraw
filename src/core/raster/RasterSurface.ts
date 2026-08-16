import type { RgbaColor, TileCoordinate } from "../../contracts/raster";
import { RASTER_LIMITS } from "../../config/raster";
import { eraseAlpha, sourceOver } from "../../logic/raster/colorComposite";
import {
  localPixelCoordinate, pixelByteOffset, pixelTileCoordinate, tileKey
} from "./tileAddress";

export type TileVisitor = (
  coordinate: TileCoordinate,
  bytes: Uint8ClampedArray
) => void;

export class RasterSurface {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly #tiles = new Map<string, Uint8ClampedArray>();

  constructor(
    id: string,
    width: number,
    height: number,
    tileSize: number = RASTER_LIMITS.tileSize
  ) {
    if (!id || !Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || !Number.isInteger(tileSize) || tileSize < 1) {
      throw new Error("Raster surface requires a valid id, size and tile size");
    }
    this.id = id;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
  }

  get allocatedTileCount(): number {
    return this.#tiles.size;
  }

  get allocatedBytes(): number {
    return this.#tiles.size * this.tileSize * this.tileSize * 4;
  }

  containsPixel(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) &&
      x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getPixel(x: number, y: number): RgbaColor {
    if (!this.containsPixel(x, y)) return { red: 0, green: 0, blue: 0, alpha: 0 };
    const tileX = pixelTileCoordinate(x, this.tileSize);
    const tileY = pixelTileCoordinate(y, this.tileSize);
    const bytes = this.#tiles.get(tileKey(tileX, tileY));
    if (!bytes) return { red: 0, green: 0, blue: 0, alpha: 0 };
    const offset = pixelByteOffset(
      localPixelCoordinate(x, this.tileSize),
      localPixelCoordinate(y, this.tileSize), this.tileSize
    );
    return { red: bytes[offset] ?? 0, green: bytes[offset + 1] ?? 0,
      blue: bytes[offset + 2] ?? 0, alpha: bytes[offset + 3] ?? 0 };
  }

  mutatePixel(x: number, y: number, transform: (color: RgbaColor) => RgbaColor): boolean {
    if (!this.containsPixel(x, y)) return false;
    const tileX = pixelTileCoordinate(x, this.tileSize);
    const tileY = pixelTileCoordinate(y, this.tileSize);
    const offset = pixelByteOffset(
      localPixelCoordinate(x, this.tileSize),
      localPixelCoordinate(y, this.tileSize), this.tileSize
    );
    const existing = this.#tiles.get(tileKey(tileX, tileY));
    const current = existing ? {
      red: existing[offset] ?? 0, green: existing[offset + 1] ?? 0,
      blue: existing[offset + 2] ?? 0, alpha: existing[offset + 3] ?? 0
    } : { red: 0, green: 0, blue: 0, alpha: 0 };
    const next = transform(current);
    if (next.red === current.red && next.green === current.green &&
        next.blue === current.blue && next.alpha === current.alpha) return true;
    const bytes = existing ?? this.ensureTile(tileX, tileY);
    bytes[offset] = next.red;
    bytes[offset + 1] = next.green;
    bytes[offset + 2] = next.blue;
    bytes[offset + 3] = next.alpha;
    return true;
  }

  blendPixel(x: number, y: number, color: RgbaColor, opacity = 1): boolean {
    return this.mutatePixel(x, y, (destination) => sourceOver(destination, color, opacity));
  }

  erasePixel(x: number, y: number, opacity = 1): boolean {
    return this.mutatePixel(x, y, (destination) => eraseAlpha(destination, opacity));
  }

  copyTile(x: number, y: number): Uint8ClampedArray | null {
    const bytes = this.#tiles.get(tileKey(x, y));
    return bytes ? bytes.slice() : null;
  }

  replaceTile(x: number, y: number, bytes: Uint8ClampedArray | null): void {
    const key = tileKey(x, y);
    if (!bytes || bytes.every((value) => value === 0)) this.#tiles.delete(key);
    else if (bytes.length === this.tileSize * this.tileSize * 4) this.#tiles.set(key, bytes.slice());
    else throw new Error("Tile byte length does not match surface tile size");
  }

  visitTiles(visitor: TileVisitor): void {
    for (const [key, bytes] of this.#tiles) {
      const [x, y] = key.split(":").map(Number);
      visitor({ x: x ?? 0, y: y ?? 0 }, bytes);
    }
  }

  private ensureTile(x: number, y: number): Uint8ClampedArray {
    const key = tileKey(x, y);
    let bytes = this.#tiles.get(key);
    if (!bytes) {
      bytes = new Uint8ClampedArray(this.tileSize * this.tileSize * 4);
      this.#tiles.set(key, bytes);
    }
    return bytes;
  }
}
