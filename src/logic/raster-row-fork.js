import { gridBoundsMetadata, setGridBounds } from './raster.js';

// Copy-on-write fork for reference-backed history. The outer row list is cheap;
// pixel arrays are copied only immediately before a caller changes that row.
export function forkRasterRows(source, fallbackBounds = null) {
  const grid = source.slice(), copied = new Set();
  const metadata = gridBoundsMetadata(source);
  setGridBounds(grid, metadata?.bounds ?? fallbackBounds,
    metadata?.exact ?? false);
  const writableRow = (y) => {
    if (!copied.has(y)) {
      grid[y] = source[y].slice(); copied.add(y);
    }
    return grid[y];
  };
  return { grid, writableRow, copied };
}
