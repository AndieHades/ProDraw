import type { SparseRow } from "./sparse-grid-row.ts";
import { sparseGridRows, sparseGridShape } from "./sparse-grid.ts";
import { packedRgbaStats } from "./raster/PackedRgbaGrid.ts";

export interface SparseGridStats {
  readonly width: number;
  readonly height: number;
  readonly materializedRows?: number;
  readonly contentRows?: number;
  readonly storedCells?: number;
  readonly allocatedCells?: number;
}

const indexOf = (key: string, length: number): number => {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key ? index : -1;
};

export function sparseGridStats(grid: unknown): SparseGridStats | null {
  const packed = packedRgbaStats(grid); if (packed) return packed;
  const shape = sparseGridShape(grid), rows = sparseGridRows(grid);
  if (!shape || !rows) return null;
  let contentRows = 0, storedCells = 0, allocatedCells = 0;
  for (const [, row] of rows) {
    let content = 0;
    for (const key of Object.keys((row ?? []) as SparseRow)) {
      const x = indexOf(key, row?.length ?? 0); if (x < 0) continue;
      allocatedCells++; if (row?.[x]) { storedCells++; content++; }
    }
    if (content) contentRows++;
  }
  return { ...shape, materializedRows: rows.length,
    contentRows, storedCells, allocatedCells };
}
