import { createSparseGrid, sparseGridShape, visitSparseGridCells } from './sparse-grid.js';
import { createRasterCellInterner } from './raster-cell-interner.js';
import { clonePackedRgbaGrid, invalidatePackedRgbaBounds, notePackedRgbaBounds,
  packedRgbaBounds, packedRgbaBoundsMetadata, packedRgbaShape,
  setPackedRgbaBounds, visitPackedRgbaCells } from './raster/PackedRgbaGrid.ts';

let boundsMetadata = new WeakMap();
const copyBounds = (bounds) => bounds ? { ...bounds } : null;
const mergeBounds = (left, right) => !left ? copyBounds(right) : {
  minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
  maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy),
};
const include = (state, x, y) => {
  state.minx = Math.min(state.minx, x); state.miny = Math.min(state.miny, y);
  state.maxx = Math.max(state.maxx, x); state.maxy = Math.max(state.maxy, y);
};
const result = (state) => state.maxx < 0 ? null : { minx: state.minx,
  miny: state.miny, maxx: state.maxx, maxy: state.maxy };

function sparseBlank(width, height) {
  let grid;
  grid = createSparseGrid(width, height, {
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

export const blank = (width, height) => sparseBlank(width, height);

function dimensions(grid) {
  const packed = packedRgbaShape(grid); if (packed) return packed;
  const sparse = sparseGridShape(grid); if (sparse) return sparse;
  let width = 0;
  for (const key of Object.keys(grid)) {
    if (Array.isArray(grid[key])) width = Math.max(width, grid[key].length);
  }
  return { width, height: grid.length };
}

function visitDense(grid, bounds, visit) {
  const { width, height } = dimensions(grid);
  const minx = Math.max(0, bounds?.minx ?? 0), miny = Math.max(0, bounds?.miny ?? 0);
  const maxx = Math.min(width - 1, bounds?.maxx ?? width - 1);
  const maxy = Math.min(height - 1, bounds?.maxy ?? height - 1);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const cell = grid[y]?.[x]; if (cell) visit(x, y, cell);
  }
}

function visitContent(grid, bounds, visit) {
  if (!visitPackedRgbaCells(grid, visit) &&
    !visitSparseGridCells(grid, visit)) visitDense(grid, bounds, visit);
}

export function cloneGrid(grid, internCells = false) {
  const packed = clonePackedRgbaGrid(grid); if (packed) return packed;
  const shape = dimensions(grid), out = blank(shape.width, shape.height);
  const cells = internCells ? createRasterCellInterner() : null;
  const known = boundsMetadata.get(grid);
  const state = { minx: shape.width, miny: shape.height, maxx: -1, maxy: -1 };
  visitContent(grid, known?.bounds, (x, y, cell) => {
    out[y][x] = cells ? cells.copy(cell) : cell.slice(); include(state, x, y);
  });
  boundsMetadata.set(out, { bounds: result(state), exact: true }); return out;
}

export function noteGridBounds(grid, bounds) {
  if (notePackedRgbaBounds(grid, bounds)) return true;
  if (!grid || !bounds || !boundsMetadata.has(grid)) return false;
  const known = boundsMetadata.get(grid);
  boundsMetadata.set(grid, { bounds: mergeBounds(known.bounds, bounds), exact: false });
  return true;
}

export function forgetGridBounds(grid) { if (invalidatePackedRgbaBounds(grid)) return;
  if (grid) boundsMetadata.delete(grid); }

export function setGridBounds(grid, bounds, exact = true) {
  if (!grid) return false;
  if (setPackedRgbaBounds(grid, bounds, exact)) return true;
  boundsMetadata.set(grid, { bounds: copyBounds(bounds), exact: !!exact }); return true;
}

export function gridBoundsMetadata(grid) {
  const packed = packedRgbaBoundsMetadata(grid); if (packed) return packed;
  const known = grid && boundsMetadata.get(grid);
  return known ? { bounds: copyBounds(known.bounds), exact: known.exact } : undefined;
}

export function gridBounds(grid) {
  if (packedRgbaShape(grid)) return packedRgbaBounds(grid);
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

export function conservativeGridBounds(grid) {
  const packed = packedRgbaBoundsMetadata(grid);
  if (packed) return packed.exact ? copyBounds(packed.bounds) : packedRgbaBounds(grid);
  const known = boundsMetadata.get(grid);
  return known ? copyBounds(known.bounds) : gridBounds(grid);
}
