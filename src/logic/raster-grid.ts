import type { SparseGrid } from "./sparse-grid.ts";
import { createSparseGrid, sparseGridShape, visitSparseGridCells } from "./sparse-grid.ts";
import { createRasterCellInterner } from "./raster-cell-interner.ts";
import { clonePackedRgbaGrid, invalidatePackedRgbaBounds, notePackedRgbaBounds,
  packedRgbaBounds, packedRgbaBoundsMetadata, packedRgbaShape,
  setPackedRgbaBounds, visitPackedRgbaCells } from "./raster/PackedRgbaGrid.ts";

export interface GridBounds {
  minx: number; miny: number; maxx: number; maxy: number;
}
export interface GridBoundsMetadata {
  readonly bounds: GridBounds | null; readonly exact: boolean;
}
type AnyGrid = object;
type CellVisitor = (x: number, y: number, cell: number[]) => void;

const boundsMetadata = new WeakMap<object, GridBoundsMetadata>();
const copyBounds = (bounds: GridBounds | null | undefined): GridBounds | null => bounds ? { ...bounds } : null;
const mergeBounds = (left: GridBounds | null, right: GridBounds): GridBounds | null => !left ? copyBounds(right) : {
  minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
  maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy),
};
const include = (state: GridBounds, x: number, y: number): void => {
  state.minx = Math.min(state.minx, x); state.miny = Math.min(state.miny, y);
  state.maxx = Math.max(state.maxx, x); state.maxy = Math.max(state.maxy, y);
};
const result = (state: GridBounds): GridBounds | null => state.maxx < 0 ? null : { minx: state.minx,
  miny: state.miny, maxx: state.maxx, maxy: state.maxy };

function sparseBlank(width: number, height: number): SparseGrid {
  const grid: SparseGrid = createSparseGrid(width, height, {
    onCell: (x, y, before, after) => {
      const known = boundsMetadata.get(grid); if (!known) return;
      if (after) boundsMetadata.set(grid, {
        bounds: mergeBounds(known.bounds, { minx: x, miny: y, maxx: x, maxy: y }),
        exact: known.exact,
      });
      else if (before && known.bounds) boundsMetadata.set(grid,
        { bounds: known.bounds, exact: false });
    },
    onRow: () => boundsMetadata.delete(grid),
  });
  boundsMetadata.set(grid, { bounds: null, exact: true }); return grid;
}

export const blank = (width: number, height: number): SparseGrid =>
  sparseBlank(width, height);

function dimensions(grid: AnyGrid): { width: number; height: number } {
  const packed = packedRgbaShape(grid); if (packed) return packed;
  const sparse = sparseGridShape(grid); if (sparse) return sparse;
  const rows = grid as Record<string, unknown> & { length?: number };
  let width = 0;
  for (const key of Object.keys(rows)) {
    const row = rows[key];
    if (Array.isArray(row)) width = Math.max(width, row.length);
  }
  return { width, height: rows.length ?? 0 };
}

function visitDense(grid: AnyGrid, bounds: GridBounds | null | undefined, visit: CellVisitor): void {
  const { width, height } = dimensions(grid);
  const minx = Math.max(0, bounds?.minx ?? 0), miny = Math.max(0, bounds?.miny ?? 0);
  const maxx = Math.min(width - 1, bounds?.maxx ?? width - 1);
  const maxy = Math.min(height - 1, bounds?.maxy ?? height - 1);
  const rows = grid as (number[] | null | undefined)[][];
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const cell = rows[y]?.[x]; if (cell) visit(x, y, cell);
  }
}

function visitContent(grid: AnyGrid, bounds: GridBounds | null | undefined, visit: CellVisitor): void {
  if (!visitPackedRgbaCells(grid, visit) &&
    !visitSparseGridCells(grid, visit)) visitDense(grid, bounds, visit);
}

export function cloneGrid(grid: AnyGrid, internCells = false): AnyGrid {
  const packed = clonePackedRgbaGrid(grid); if (packed) return packed;
  const shape = dimensions(grid), out = blank(shape.width, shape.height);
  const cells = internCells ? createRasterCellInterner() : null;
  const known = boundsMetadata.get(grid);
  const state = { minx: shape.width, miny: shape.height, maxx: -1, maxy: -1 };
  visitContent(grid, known?.bounds, (x, y, cell) => {
    const row = out[y]; if (!row) return;
    row[x] = (cells ? cells.copy(cell) : cell.slice()) as number[];
    include(state, x, y);
  });
  boundsMetadata.set(out, { bounds: result(state), exact: true }); return out;
}

export function noteGridBounds(grid: AnyGrid, bounds: GridBounds | null): boolean {
  if (bounds && notePackedRgbaBounds(grid, bounds)) return true;
  if (!grid || !bounds || !boundsMetadata.has(grid)) return false;
  const known = boundsMetadata.get(grid);
  boundsMetadata.set(grid, { bounds: mergeBounds(known?.bounds ?? null, bounds),
    exact: false });
  return true;
}

export function forgetGridBounds(grid: AnyGrid): void { if (invalidatePackedRgbaBounds(grid)) return;
  if (grid) boundsMetadata.delete(grid); }

export function setGridBounds(grid: AnyGrid, bounds: GridBounds | null, exact = true): boolean {
  if (!grid) return false;
  if (bounds && setPackedRgbaBounds(grid, bounds, exact)) return true;
  boundsMetadata.set(grid, { bounds: copyBounds(bounds), exact: !!exact }); return true;
}

export function gridBoundsMetadata(grid: AnyGrid): GridBoundsMetadata | undefined {
  const packed = packedRgbaBoundsMetadata(grid);
  if (packed) return { bounds: copyBounds(packed.bounds), exact: packed.exact };
  const known = grid && boundsMetadata.get(grid);
  return known ? { bounds: copyBounds(known.bounds), exact: known.exact } : undefined;
}

export function gridBounds(grid: AnyGrid): GridBounds | null {
  if (packedRgbaShape(grid)) return packedRgbaBounds(grid) ?? null;
  const known = boundsMetadata.get(grid);
  // Sparse rows keep native data properties on the hot paint path; an exact
  // query therefore rechecks only stored properties to notice direct erases.
  if (known?.exact && !sparseGridShape(grid)) return copyBounds(known.bounds);
  const shape = dimensions(grid);
  const state = { minx: shape.width, miny: shape.height, maxx: -1, maxy: -1 };
  visitContent(grid, known?.bounds, (x, y) => include(state, x, y));
  const bounds = result(state);
  boundsMetadata.set(grid, { bounds, exact: true }); return copyBounds(bounds);
}

export function conservativeGridBounds(grid: AnyGrid): GridBounds | null {
  const packed = packedRgbaBoundsMetadata(grid);
  if (packed) return packed.exact ? copyBounds(packed.bounds)
    : packedRgbaBounds(grid) ?? null;
  const known = boundsMetadata.get(grid);
  return known ? copyBounds(known.bounds) : gridBounds(grid);
}
