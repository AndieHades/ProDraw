import type { GridBounds } from "./raster-grid.ts";
import { gridBoundsMetadata, setGridBounds } from "./raster.ts";

export type ForkRow = (number[] | null)[];
export interface RasterRowFork {
  readonly grid: ForkRow[];
  writableRow(y: number): ForkRow;
  readonly copied: Set<number>;
}

// Copy-on-write fork for reference-backed history. The outer row list is cheap;
// pixel arrays are copied only immediately before a caller changes that row.
export function forkRasterRows(source: ForkRow[],
  fallbackBounds: GridBounds | null = null): RasterRowFork {
  const grid = source.slice(), copied = new Set<number>();
  const metadata = gridBoundsMetadata(source);
  setGridBounds(grid, metadata?.bounds ?? fallbackBounds, metadata?.exact ?? false);
  const writableRow = (y: number): ForkRow => {
    if (!copied.has(y)) {
      grid[y] = (source[y] ?? []).slice(); copied.add(y);
    }
    return grid[y] as ForkRow;
  };
  return { grid, writableRow, copied };
}
