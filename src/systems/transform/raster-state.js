// Reference-safe raster state for Free Transform. Untouched rows stay shared;
// any row written by a selection transform is copied first.
import { blank } from '../../core/state.js';
import { maskHas } from '../../core/selection.js';
import { parseKey, setGridBounds } from '../../logic/raster.js';

const copyBounds = (bounds) => bounds ? { ...bounds } : null;
export const unionBounds = (left, right) => !left ? copyBounds(right) : !right
  ? copyBounds(left) : {
    minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy),
  };

export function canvasBounds(bounds, width, height) {
  if (!bounds) return null;
  const clipped = { minx: Math.max(0, bounds.minx), miny: Math.max(0, bounds.miny),
    maxx: Math.min(width - 1, bounds.maxx), maxy: Math.min(height - 1, bounds.maxy) };
  return clipped.maxx < clipped.minx || clipped.maxy < clipped.miny ? null : clipped;
}

export function intersectBounds(left, right) {
  if (!left || !right) return null;
  const bounds = { minx: Math.max(left.minx, right.minx), miny: Math.max(left.miny, right.miny),
    maxx: Math.min(left.maxx, right.maxx), maxy: Math.min(left.maxy, right.maxy) };
  return bounds.minx <= bounds.maxx && bounds.miny <= bounds.maxy ? bounds : null;
}

export function boundsWithExtReferences(bounds, ext) {
  let result = copyBounds(bounds);
  for (const key of ext?.keys?.() || []) { const [x, y] = parseKey(key);
    result = unionBounds(result, { minx: x, miny: y, maxx: x, maxy: y }); }
  return result;
}

export function sparseGrid(width, height) {
  const grid = blank(0, height);
  for (let y = 0; y < height; y++) grid[y] = new Array(width);
  return grid;
}

export function sourceFromRect(layer, bounds, width, accept = null, scan = bounds) {
  const rows = new Array(bounds.maxy - bounds.miny + 1), clipped = intersectBounds(bounds, scan);
  if (!clipped) return null; let localBounds = null;
  for (let y = clipped.miny; y <= clipped.maxy; y++) {
    let row = null;
    for (let x = clipped.minx; x <= clipped.maxx; x++) {
      if (accept && !accept(x, y)) continue;
      const cell = layer.grid[y] && x >= 0 && x < width
        ? layer.grid[y][x] : layer.ext.get(x + ',' + y);
      if (cell) { if (!row) { row = new Array(bounds.maxx - bounds.minx + 1);
          rows[y - bounds.miny] = row; }
        const lx = x - bounds.minx, ly = y - bounds.miny; row[lx] = cell.slice();
        localBounds = unionBounds(localBounds, { minx: lx, miny: ly, maxx: lx, maxy: ly }); }
    }
  }
  return localBounds ? { rows, localBounds } : null;
}

function forkGrid(source, bounds) {
  const grid = source.slice(); setGridBounds(grid, bounds, false);
  return { source, grid, bounds, copied: new Set() };
}

function writableRow(fork, y) {
  if (!fork.copied.has(y)) {
    fork.grid[y] = fork.source[y].slice(); fork.copied.add(y);
  }
  return fork.grid[y];
}

function clearSelection(fork, selection, mask) {
  const scan = intersectBounds({ minx: selection.x0, miny: selection.y0,
    maxx: selection.x1, maxy: selection.y1 }, fork.bounds);
  if (!scan) return null;
  let changed = null;
  for (let y = scan.miny; y <= scan.maxy; y++) {
    const source = fork.source[y]; if (!source) continue;
    for (let x = scan.minx; x <= scan.maxx; x++) {
      if (!maskHas(mask, x, y) || !source[x]) continue;
      writableRow(fork, y)[x] = null;
      changed = unionBounds(changed, { minx: x, miny: y, maxx: x, maxy: y });
    }
  }
  return changed;
}

export function liftSelectionSources(sources, selection, mask) {
  return sources.map((source) => {
    const backup = { L: source.L, idx: source.idx, grid: source.L.grid,
      ext: source.L.ext, bounds: source.bounds };
    const fork = forkGrid(backup.grid, backup.bounds);
    backup.changedBounds = clearSelection(fork, selection, mask);
    source.L.grid = fork.grid;
    return backup;
  });
}

export function restoreRasterReferences(backups) {
  for (const backup of backups) {
    if (!backup.L) continue;
    backup.L.grid = backup.grid; backup.L.ext = backup.ext;
  }
}

function resultBounds(result, width, height) {
  return result && canvasBounds(result, width, height);
}

export function applySelectionResults(backups, per, selection, mask, width, height) {
  const byLayer = new Map(per.map(({ s, r }) => [s.L, r]));
  return backups.map((backup) => {
    const fork = forkGrid(backup.grid, backup.bounds), ext = new Map(backup.ext);
    const cleared = clearSelection(fork, selection, mask);
    const result = byLayer.get(backup.L);
    if (result) for (const [x, y, cell] of result.cells) {
      if (x >= 0 && y >= 0 && x < width && y < height)
        writableRow(fork, y)[x] = cell.slice();
      else ext.set(x + ',' + y, cell.slice());
    }
    backup.L.grid = fork.grid; backup.L.ext = ext;
    return { idx: backup.idx, bounds: unionBounds(cleared,
      resultBounds(result, width, height)) };
  });
}

export function rasterizeTransformResult(result, width, height) {
  const grid = sparseGrid(width, height), ext = new Map();
  if (result) for (const [x, y, cell] of result.cells) {
    if (x >= 0 && y >= 0 && x < width && y < height) grid[y][x] = cell.slice();
    else ext.set(x + ',' + y, cell.slice());
  }
  setGridBounds(grid, canvasBounds(result, width, height), true);
  return { grid, ext };
}
