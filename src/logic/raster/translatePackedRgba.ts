import type { PackedRgbaRowRecord } from "../../contracts/packedRgbaGrid.ts";
import type { GridBounds } from "../raster-grid.ts";
import { createPackedRgbaGrid, packedRgbaState } from "./PackedRgbaGrid.ts";
import { PackedRasterExt, type ExtCell } from "./PackedRasterExt.ts";
import { mergePackedRow, slicePackedRow } from "./packedRowSlice.ts";

export interface PackedTranslation {
  readonly grid: unknown[];
  readonly ext: Map<string, ExtCell>;
  readonly bounds: GridBounds | null;
}

export function translatePackedRgba(grid: unknown,
  ext: Iterable<[string, ExtCell]> | null | undefined, dx: number, dy: number,
  width: number, height: number, preserveGrid: boolean): PackedTranslation | null {
  const state = packedRgbaState(grid); if (!state) return null;
  const rows = new Map<number, PackedRgbaRowRecord>(), outside = new PackedRasterExt();
  const putRow = (source: PackedRgbaRowRecord, preserve: boolean) => {
    if (!source.opaquePixels) return;
    const row = { ...source, y: source.y + dy, left: source.left + dx };
    const count = row.bytes.length / 4;
    const from = Math.min(count, Math.max(0, -row.left));
    const to = Math.max(from, Math.min(count, width - row.left));
    if (row.y < 0 || row.y >= height) {
      const whole = slicePackedRow(row, 0, count); if (whole) outside.addRow(whole);
      return;
    }
    const inside = slicePackedRow(row, from, to);
    if (inside) rows.set(row.y, mergePackedRow(rows.get(row.y), inside, preserve));
    const left = slicePackedRow(row, 0, from), right = slicePackedRow(row, to, count);
    if (left) outside.addRow(left);
    if (right) outside.addRow(right);
  };
  for (const [y, row] of state.rows) putRow({ ...row, y }, false);
  if (ext instanceof PackedRasterExt) for (const row of ext.spans())
    putRow(row, preserveGrid);
  let opaquePixels = 0, minx = width, miny = height, maxx = -1, maxy = -1;
  for (const row of rows.values()) {
    opaquePixels += row.opaquePixels;
    minx = Math.min(minx, row.left); miny = Math.min(miny, row.y);
    maxx = Math.max(maxx, row.left + row.bytes.length / 4 - 1);
    maxy = Math.max(maxy, row.y);
  }
  const output = createPackedRgbaGrid({ format: "rgba-rows-v1", width, height,
    rows: [...rows.values()], bounds: maxx < 0 ? null : { minx, miny, maxx, maxy }, opaquePixels });
  const target = packedRgbaState(output); if (!output || !target) return null;
  const cells = ext instanceof PackedRasterExt ? ext.looseCells() : ext ?? [];
  for (const [key, cell] of cells) {
    const comma = key.indexOf(",");
    const x = +key.slice(0, comma) + dx, y = +key.slice(comma + 1) + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) outside.set(`${x},${y}`, cell.slice());
    else if (!preserveGrid || !target.cell(x, y)) target.set(x, y, cell);
  }
  return { grid: output, ext: outside, bounds: target.bounds() };
}
