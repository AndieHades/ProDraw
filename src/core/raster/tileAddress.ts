import type { TileCoordinate } from "../../contracts/raster.ts";

export function tileKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function parseTileKey(key: string): TileCoordinate {
  const [rawX, rawY] = key.split(":");
  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`Invalid tile key: ${key}`);
  }
  return { x, y };
}

export function pixelTileCoordinate(value: number, tileSize: number): number {
  return Math.floor(value / tileSize);
}

export function localPixelCoordinate(value: number, tileSize: number): number {
  return value - pixelTileCoordinate(value, tileSize) * tileSize;
}

export function pixelByteOffset(x: number, y: number, tileSize: number): number {
  return (y * tileSize + x) * 4;
}
