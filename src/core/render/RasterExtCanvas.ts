import type { GridBounds } from "../../logic/raster-grid.ts";
import type { ExtCell } from "../../contracts/packedRasterExt.ts";
import { copyRasterExt, rasterExtBounds } from "../../logic/raster/rasterExtRegion.ts";
import { paintCanvas } from "../canvas.ts";

// Only materialize the part that can enter the visible document during Move
// or clipping. A tiny trimmed canvas must not rasterize the entire old layer.
export function createRasterExtCanvas(ext: Map<string, ExtCell>,
  region: GridBounds | null = null):
{ readonly canvas: HTMLCanvasElement; readonly ox: number; readonly oy: number } | null {
  let bounds = rasterExtBounds(ext); if (!bounds) return null;
  if (region) bounds = { minx: Math.max(bounds.minx, region.minx),
    miny: Math.max(bounds.miny, region.miny), maxx: Math.min(bounds.maxx, region.maxx),
    maxy: Math.min(bounds.maxy, region.maxy) };
  if (bounds.maxx < bounds.minx || bounds.maxy < bounds.miny) return null;
  const area = bounds;
  const canvas = paintCanvas(area.maxx - area.minx + 1, area.maxy - area.miny + 1,
    (data) => copyRasterExt(ext, area, data));
  return { canvas, ox: area.minx, oy: area.miny };
}
