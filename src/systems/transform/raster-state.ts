import type { SelectionRect } from "../../contracts/selection.ts";
import { maskHas } from "../../core/selection/SelectionGeometry.ts";
import type { GridFork, GridRow, LegacyGrid, MaskLike, MutableCell, PerResult,
  RasterBackup, RasterBounds, TransformCell, TransformResult,
  TransformLayer, TransformSourceEntry } from "./TransformRasterTypes.ts";
export type { RasterBounds } from "./TransformRasterTypes.ts";

const copyBounds = (bounds: RasterBounds | null | undefined): RasterBounds | null =>
  bounds ? { ...bounds } : null;
export const unionBounds = (left: RasterBounds | null | undefined,
  right: RasterBounds | null | undefined): RasterBounds | null => !left
  ? copyBounds(right) : !right ? copyBounds(left) : {
    minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy) };

export function canvasBounds(bounds: RasterBounds | null | undefined, width: number,
  height: number): RasterBounds | null {
  if (!bounds) return null;
  const clipped = { minx: Math.max(0, bounds.minx), miny: Math.max(0, bounds.miny),
    maxx: Math.min(width - 1, bounds.maxx), maxy: Math.min(height - 1, bounds.maxy) };
  return clipped.maxx < clipped.minx || clipped.maxy < clipped.miny ? null : clipped;
}

export function intersectBounds(left: RasterBounds | null | undefined,
  right: RasterBounds | null | undefined): RasterBounds | null {
  if (!left || !right) return null;
  const bounds = { minx: Math.max(left.minx, right.minx),
    miny: Math.max(left.miny, right.miny), maxx: Math.min(left.maxx, right.maxx),
    maxy: Math.min(left.maxy, right.maxy) };
  return bounds.minx <= bounds.maxx && bounds.miny <= bounds.maxy ? bounds : null;
}

const parsePoint = (key: string): readonly [number, number] => {
  const separator = key.indexOf(",");
  return [Number(key.slice(0, separator)), Number(key.slice(separator + 1))];
};
export function boundsWithExtReferences(bounds: RasterBounds | null,
  ext: ReadonlyMap<string, TransformCell> | null | undefined): RasterBounds | null {
  let result = copyBounds(bounds);
  for (const key of ext?.keys() ?? []) { const [x, y] = parsePoint(key);
    result = unionBounds(result, { minx: x, miny: y, maxx: x, maxy: y }); }
  return result;
}

const sparseGrid = (width: number, height: number): LegacyGrid =>
  Array.from({ length: height }, () => new Array<MutableCell | null | undefined>(width));
const copyCell = (cell: TransformCell): MutableCell => [...cell];

export function sourceFromRect(layer: TransformLayer, bounds: RasterBounds, width: number,
  accept: ((x: number, y: number) => boolean) | null = null,
  scan: RasterBounds = bounds): { readonly rows: LegacyGrid;
    readonly localBounds: RasterBounds } | null {
  const rows = new Array<GridRow>(bounds.maxy - bounds.miny + 1);
  const clipped = intersectBounds(bounds, scan); if (!clipped) return null;
  let localBounds: RasterBounds | null = null;
  for (let y = clipped.miny; y <= clipped.maxy; y++) {
    let row: GridRow | null = null;
    for (let x = clipped.minx; x <= clipped.maxx; x++) {
      if (accept && !accept(x, y)) continue;
      const cell = layer.grid[y] && x >= 0 && x < width
        ? layer.grid[y]?.[x] : layer.ext.get(`${x},${y}`);
      if (!cell) continue;
      if (!row) { row = new Array(bounds.maxx - bounds.minx + 1);
        rows[y - bounds.miny] = row; }
      const localX = x - bounds.minx, localY = y - bounds.miny;
      row[localX] = copyCell(cell);
      localBounds = unionBounds(localBounds,
        { minx: localX, miny: localY, maxx: localX, maxy: localY });
    }
  }
  return localBounds ? { rows, localBounds } : null;
}

const forkGrid = (source: LegacyGrid, bounds: RasterBounds): GridFork => ({
  source, grid: source.slice(), bounds, copied: new Set() });
function writableRow(fork: GridFork, y: number): GridRow {
  if (!fork.copied.has(y)) {
    fork.grid[y] = fork.source[y]?.slice() ?? []; fork.copied.add(y);
  }
  return fork.grid[y] ?? [];
}

function clearSelection(fork: GridFork, selection: SelectionRect,
  mask: MaskLike | null | undefined): RasterBounds | null {
  const scan = intersectBounds({ minx: selection.x0, miny: selection.y0,
    maxx: selection.x1, maxy: selection.y1 }, fork.bounds);
  if (!scan) return null; let changed: RasterBounds | null = null;
  for (let y = scan.miny; y <= scan.maxy; y++) { const source = fork.source[y];
    if (!source) continue;
    for (let x = scan.minx; x <= scan.maxx; x++) {
      if (!maskHas(mask, x, y) || !source[x]) continue;
      writableRow(fork, y)[x] = null;
      changed = unionBounds(changed, { minx: x, miny: y, maxx: x, maxy: y });
    }
  }
  return changed;
}

export function liftSelectionSources(sources: readonly TransformSourceEntry[],
  selection: SelectionRect, mask: MaskLike | null | undefined): RasterBackup[] {
  return sources.map((source) => { const backup: RasterBackup = { ...source,
      grid: source.L.grid, ext: source.L.ext, changedBounds: null };
    const fork = forkGrid(backup.grid, backup.bounds ??
      { minx: 0, miny: 0, maxx: -1, maxy: -1 });
    backup.changedBounds = clearSelection(fork, selection, mask);
    source.L.grid = fork.grid; return backup; });
}

export function restoreRasterReferences(backups: readonly RasterBackup[]): void {
  for (const backup of backups) {
    backup.L.grid = backup.grid; backup.L.ext = backup.ext;
  }
}

export function applySelectionResults(backups: readonly RasterBackup[],
  per: readonly PerResult[], selection: SelectionRect,
  mask: MaskLike | null | undefined, width: number, height: number):
{ readonly idx: number; readonly bounds: RasterBounds | null }[] {
  const byLayer = new Map(per.map(({ s, r }) => [s.L, r]));
  return backups.map((backup) => {
    const fallback = { minx: 0, miny: 0, maxx: -1, maxy: -1 };
    const fork = forkGrid(backup.grid, backup.bounds ?? fallback), ext = new Map(backup.ext);
    const cleared = clearSelection(fork, selection, mask), result = byLayer.get(backup.L);
    if (result) for (const [x, y, cell] of result.cells) {
      if (x >= 0 && y >= 0 && x < width && y < height)
        writableRow(fork, y)[x] = copyCell(cell);
      else ext.set(`${x},${y}`, copyCell(cell));
    }
    backup.L.grid = fork.grid; backup.L.ext = ext;
    return { idx: backup.idx, bounds: unionBounds(cleared,
      result ? canvasBounds(result, width, height) : null) };
  });
}

export function rasterizeTransformResult(result: TransformResult | null, width: number,
  height: number): { readonly grid: LegacyGrid;
    readonly ext: Map<string, MutableCell> } {
  const grid = sparseGrid(width, height), ext = new Map<string, MutableCell>();
  if (result) for (const [x, y, cell] of result.cells) {
    if (x >= 0 && y >= 0 && x < width && y < height) {
      const row = grid[y]; if (row) row[x] = copyCell(cell);
    } else ext.set(`${x},${y}`, copyCell(cell));
  }
  return { grid, ext };
}
