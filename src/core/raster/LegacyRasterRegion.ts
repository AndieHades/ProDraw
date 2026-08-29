import type { RasterSurface } from "./RasterSurface.ts";

export interface LegacyRasterBounds {
  readonly minx: number;
  readonly miny: number;
  readonly maxx: number;
  readonly maxy: number;
}

export interface LegacyRasterRegion {
  readonly minx: number;
  readonly miny: number;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export function copySurfaceRegion(surface: RasterSurface,
  bounds: LegacyRasterBounds): LegacyRasterRegion {
  const minx = Math.max(0, Math.floor(bounds.minx));
  const miny = Math.max(0, Math.floor(bounds.miny));
  const maxx = Math.min(surface.width - 1, Math.floor(bounds.maxx));
  const maxy = Math.min(surface.height - 1, Math.floor(bounds.maxy));
  const width = Math.max(0, maxx - minx + 1), height = Math.max(0, maxy - miny + 1);
  const data = new Uint8ClampedArray(width * height * 4), size = surface.tileSize;
  if (!width || !height) return { minx, miny, width, height, data };
  for (let tileY = Math.floor(miny / size); tileY <= Math.floor(maxy / size); tileY++) {
    for (let tileX = Math.floor(minx / size); tileX <= Math.floor(maxx / size); tileX++) {
      const bytes = surface.copyTile(tileX, tileY); if (!bytes) continue;
      const left = Math.max(minx, tileX * size), right = Math.min(maxx, (tileX + 1) * size - 1);
      const top = Math.max(miny, tileY * size), bottom = Math.min(maxy, (tileY + 1) * size - 1);
      for (let y = top; y <= bottom; y++) { const length = (right - left + 1) * 4;
        const source = ((y - tileY * size) * size + left - tileX * size) * 4;
        const target = ((y - miny) * width + left - minx) * 4;
        data.set(bytes.subarray(source, source + length), target); }
    }
  }
  return { minx, miny, width, height, data };
}
