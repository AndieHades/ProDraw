import type { RasterSurface } from "./RasterSurface.ts";
import type { LegacyRasterBounds } from "./LegacyRasterRegion.ts";
import { copyPackedRgbaTile,
  replacePackedRgbaTile } from "../../logic/raster/PackedRgbaGridTiles.ts";

type Grid = { readonly length: number; [index: number]: unknown[] };
const numericKeys = (value: object): number[] => Object.keys(value)
  .map(Number).filter((key) => Number.isInteger(key) && key >= 0);

export function loadLegacyGridTile(surface: RasterSurface, grid: Grid,
  tileX: number, tileY: number, width: number, height: number,
  bounds?: LegacyRasterBounds): void {
  const packed = copyPackedRgbaTile(grid, tileX, tileY, surface.tileSize);
  if (packed !== undefined) { if (packed) surface.replaceTile(tileX, tileY, packed); return; }
  const size = surface.tileSize, bytes = new Uint8ClampedArray(size * size * 4);
  const startX = Math.max(tileX * size, bounds?.minx ?? 0);
  const startY = Math.max(tileY * size, bounds?.miny ?? 0);
  const endX = Math.min(width, (tileX + 1) * size, (bounds?.maxx ?? width - 1) + 1);
  const endY = Math.min(height, (tileY + 1) * size, (bounds?.maxy ?? height - 1) + 1);
  let occupied = false;
  for (const y of numericKeys(grid)) { if (y < startY || y >= endY) continue;
    const row = grid[y]; if (!row) continue;
    for (const x of numericKeys(row)) { if (x < startX || x >= endX) continue;
      const value = row[x]; if (!Array.isArray(value) || (value[3] ?? 255) <= 0) continue;
      const offset = ((y - tileY * size) * size + x - tileX * size) * 4;
      bytes[offset] = value[0] ?? 0; bytes[offset + 1] = value[1] ?? 0;
      bytes[offset + 2] = value[2] ?? 0; bytes[offset + 3] = value[3] ?? 255;
      occupied = true;
    }
  }
  if (occupied) surface.replaceTile(tileX, tileY, bytes);
}

export function syncLegacyGridTile(surface: RasterSurface, grid: Grid,
  tileX: number, tileY: number, width: number, height: number): void {
  const packed = surface.copyTile(tileX, tileY);
  if (replacePackedRgbaTile(grid, tileX, tileY, surface.tileSize, packed)) return;
  const size = surface.tileSize, startX = tileX * size, startY = tileY * size;
  const endX = Math.min(width, startX + size), endY = Math.min(height, startY + size);
  for (const y of numericKeys(grid)) { if (y < startY || y >= endY) continue;
    const row = grid[y]; if (!row) continue;
    for (const x of numericKeys(row)) if (x >= startX && x < endX) delete row[x];
  }
  if (!packed) return;
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
    const offset = ((y - startY) * size + x - startX) * 4;
    if (!packed[offset + 3]) continue;
    const row = grid[y] ?? (grid[y] = new Array(width));
    row[x] = [packed[offset], packed[offset + 1], packed[offset + 2], packed[offset + 3]];
  }
}
