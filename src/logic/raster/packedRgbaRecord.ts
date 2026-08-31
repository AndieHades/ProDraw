import type { PsdImportBitmap } from "../../contracts/psdImport.ts";
import type { PackedRgbaBounds, PackedRgbaGridRecord,
  PackedRgbaRowRecord } from "../../contracts/packedRgbaGrid.ts";

const FORMAT = "rgba-rows-v1";
const copyBounds = (value: PackedRgbaBounds | null): PackedRgbaBounds | null =>
  value ? { ...value } : null;

export function isPackedRgbaGridRecord(value: unknown): value is PackedRgbaGridRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PackedRgbaGridRecord>;
  return record.format === FORMAT && Number.isInteger(record.width) &&
    Number.isInteger(record.height) && Array.isArray(record.rows);
}

export function clonePackedRgbaGridRecord(
  value: PackedRgbaGridRecord,
): PackedRgbaGridRecord {
  return { format: FORMAT, width: value.width, height: value.height,
    rows: value.rows.map((row) => ({ ...row, bytes: row.bytes.slice() })),
    bounds: copyBounds(value.bounds), opaquePixels: value.opaquePixels };
}

function packedRow(bitmap: PsdImportBitmap, sourceY: number, y: number,
  startX: number, endX: number): PackedRgbaRowRecord | null {
  const sourceStart = startX - bitmap.left;
  let first = endX, last = startX - 1, opaquePixels = 0;
  for (let x = startX; x < endX; x++) {
    const alpha = bitmap.rgba[(sourceY * bitmap.width + x - bitmap.left) * 4 + 3];
    if (!alpha) continue;
    first = Math.min(first, x); last = x; opaquePixels++;
  }
  if (!opaquePixels) return null;
  const firstSource = sourceStart + first - startX;
  const byteStart = (sourceY * bitmap.width + firstSource) * 4;
  const byteEnd = byteStart + (last - first + 1) * 4;
  return { y, left: first, bytes: bitmap.rgba.slice(byteStart, byteEnd),
    opaquePixels };
}

export function packedRgbaRecordFromBitmap(
  width: number,
  height: number,
  bitmap?: PsdImportBitmap,
): PackedRgbaGridRecord {
  const rows: PackedRgbaRowRecord[] = [];
  let opaquePixels = 0, minx = width, miny = height, maxx = -1, maxy = -1;
  if (bitmap) for (let sourceY = 0; sourceY < bitmap.height; sourceY++) {
    const y = bitmap.top + sourceY;
    if (y < 0 || y >= height) continue;
    const startX = Math.max(0, bitmap.left);
    const endX = Math.min(width, bitmap.left + bitmap.width);
    if (endX <= startX) continue;
    const row = packedRow(bitmap, sourceY, y, startX, endX); if (!row) continue;
    rows.push(row); opaquePixels += row.opaquePixels;
    minx = Math.min(minx, row.left); miny = Math.min(miny, y);
    maxx = Math.max(maxx, row.left + row.bytes.length / 4 - 1); maxy = Math.max(maxy, y);
  }
  const bounds = maxx < 0 ? null : { minx, miny, maxx, maxy };
  return { format: FORMAT, width, height, rows, bounds, opaquePixels };
}

export function packedRgbaRecordCell(value: PackedRgbaGridRecord,
  x: number, y: number): number[] | null {
  const row = value.rows.find((candidate) => candidate.y === y);
  if (!row || x < row.left || x >= row.left + row.bytes.length / 4) return null;
  const offset = (x - row.left) * 4, alpha = row.bytes[offset + 3] ?? 0;
  return alpha ? [row.bytes[offset] ?? 0, row.bytes[offset + 1] ?? 0,
    row.bytes[offset + 2] ?? 0, alpha] : null;
}
