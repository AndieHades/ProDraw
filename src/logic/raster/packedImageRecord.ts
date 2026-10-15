import type { PackedRgbaGridRecord } from "../../contracts/packedRgbaGrid.ts";
import { createPackedRgbaGrid } from "./PackedRgbaGrid.ts";
import { packedRgbaRecordFromBitmap } from "./packedRgbaRecord.ts";
import { translatePackedRgba,
  type PackedTranslation } from "./translatePackedRgba.ts";

// A decoded photo becomes one byte span per row. Writing it cell by cell
// allocated a JS array per pixel: gigabytes and tens of seconds for 12 MP.
export const packedImageRecord = (width: number, height: number,
  rgba: Uint8ClampedArray): PackedRgbaGridRecord =>
  packedRgbaRecordFromBitmap(width, height, { left: 0, top: 0, width, height, rgba });

export function packedImageGrid(width: number, height: number,
  rgba: Uint8ClampedArray): unknown[] {
  const grid = createPackedRgbaGrid(packedImageRecord(width, height, rgba));
  if (!grid) throw new Error("Packed image grid could not be created");
  return grid;
}

// The image's top-left corner lands at (left, top) of the canvas. Whatever
// falls outside the canvas becomes packed off-canvas spans, so Trim and Crop
// can bring it back without a Map entry per pixel.
export function placePackedImage(width: number, height: number,
  rgba: Uint8ClampedArray, left: number, top: number,
  canvasWidth: number, canvasHeight: number): PackedTranslation {
  const placed = translatePackedRgba(packedImageGrid(width, height, rgba), null,
    left, top, canvasWidth, canvasHeight, false);
  if (!placed) throw new Error("Packed image placement failed");
  return placed;
}
