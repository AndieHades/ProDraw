import type { GridBounds } from "../raster-grid.ts";
import { PackedRasterExt, type ExtCell } from "./PackedRasterExt.ts";

export function rasterExtBounds(ext?: Map<string, unknown> | null): GridBounds | null {
  let bounds: GridBounds | null = null;
  const include = (x: number, y: number) => {
    if (!bounds) bounds = { minx: x, miny: y, maxx: x, maxy: y };
    else {
      bounds.minx = Math.min(bounds.minx, x); bounds.maxx = Math.max(bounds.maxx, x);
      bounds.miny = Math.min(bounds.miny, y); bounds.maxy = Math.max(bounds.maxy, y);
    }
  };
  if (ext instanceof PackedRasterExt) for (const row of ext.spans()) {
    if (!row.opaquePixels) continue;
    let first = 0, last = row.bytes.length / 4 - 1;
    while (first <= last && !row.bytes[first * 4 + 3]) first++;
    while (last >= first && !row.bytes[last * 4 + 3]) last--;
    if (first <= last) { include(row.left + first, row.y); include(row.left + last, row.y); }
  }
  const cells = ext instanceof PackedRasterExt ? ext.looseCells() : ext ?? [];
  for (const [key] of cells) {
    const comma = key.indexOf(","); include(+key.slice(0, comma), +key.slice(comma + 1));
  }
  return bounds;
}

export function copyRasterExt(ext: Map<string, ExtCell>, bounds: GridBounds,
  target: Uint8ClampedArray): void {
  const width = bounds.maxx - bounds.minx + 1;
  if (ext instanceof PackedRasterExt) for (const row of ext.spans()) {
    if (row.y < bounds.miny || row.y > bounds.maxy) continue;
    const left = Math.max(bounds.minx, row.left);
    const right = Math.min(bounds.maxx + 1, row.left + row.bytes.length / 4);
    if (left >= right) continue;
    target.set(row.bytes.subarray((left - row.left) * 4, (right - row.left) * 4),
      ((row.y - bounds.miny) * width + left - bounds.minx) * 4);
  }
  const cells = ext instanceof PackedRasterExt ? ext.looseCells() : ext;
  for (const [key, cell] of cells) {
    const comma = key.indexOf(","), x = +key.slice(0, comma), y = +key.slice(comma + 1);
    if (x < bounds.minx || x > bounds.maxx || y < bounds.miny || y > bounds.maxy) continue;
    const offset = ((y - bounds.miny) * width + x - bounds.minx) * 4;
    target.set([cell[0] ?? 0, cell[1] ?? 0, cell[2] ?? 0, cell[3] ?? 255], offset);
  }
}
