import type { TileCoordinate } from "../../contracts/raster.ts";
import { localPixelCoordinate, pixelByteOffset, tileKey } from "./tileAddress.ts";

export type RasterTileVisitor = (
  coordinate: TileCoordinate,
  bytes: Uint8ClampedArray
) => void;

export interface RasterPixelWrite {
  readonly x: number;
  readonly y: number;
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export function writeRasterTilePixels(
  tiles: Map<string, Uint8ClampedArray>,
  tileX: number,
  tileY: number,
  tileSize: number,
  pixels: readonly RasterPixelWrite[]
): boolean {
  const key = tileKey(tileX, tileY);
  const existing = tiles.get(key);
  const bytes = existing ?? new Uint8ClampedArray(tileSize * tileSize * 4);
  let changed = false;
  for (const pixel of pixels) {
    const { x, y, red, green, blue, alpha } = pixel;
    const offset = pixelByteOffset(localPixelCoordinate(x, tileSize),
      localPixelCoordinate(y, tileSize), tileSize);
    if (bytes[offset] === red && bytes[offset + 1] === green &&
        bytes[offset + 2] === blue && bytes[offset + 3] === alpha) continue;
    bytes[offset] = red; bytes[offset + 1] = green;
    bytes[offset + 2] = blue; bytes[offset + 3] = alpha;
    changed = true;
  }
  if (changed && !existing) tiles.set(key, bytes);
  return changed;
}
