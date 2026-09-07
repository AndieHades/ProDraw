// Пересадка растра по произвольному отображению точек: перенос, отражение и
// поворот. Клетки за холстом уходят в запас `ext`, чтобы не пропасть.
import { blank, parseKey, setGridBounds } from "./raster.ts";
import { createRasterCellInterner } from "./raster-cell-interner.ts";
import type { GridBounds } from "./raster-grid.ts";

type Cell = readonly number[];
type Grid = (Cell | null | undefined)[][];
export type RasterExt = Map<string, Cell>;
export interface RemapOptions {
  readonly wrap?: boolean;
  readonly preserveGrid?: boolean;
}
export interface RemapResult {
  readonly grid: Grid;
  readonly ext: RasterExt;
  readonly bounds: GridBounds | null;
}
type PointMap = (x: number, y: number) => readonly [number, number];
type CellVisitor = (x: number, y: number, cell: Cell, fromExt: boolean) => void;

const arrayIndex = (key: string, length: number): number => {
  const value = Number(key);
  return Number.isInteger(value) && value >= 0 && value < length &&
    String(value) === key ? value : -1;
};

function visitGrid(grid: Grid, visit: CellVisitor): void {
  for (const rowKey of Object.keys(grid || [])) {
    const y = arrayIndex(rowKey, grid.length); if (y < 0) continue;
    const row = grid[y]; if (!row) continue;
    for (const cellKey of Object.keys(row)) {
      const x = arrayIndex(cellKey, row.length); if (x < 0) continue;
      const cell = row[x]; if (cell) visit(x, y, cell, false);
    }
  }
}

function include(bounds: GridBounds | null, x: number, y: number): GridBounds {
  if (!bounds) return { minx: x, miny: y, maxx: x, maxy: y };
  bounds.minx = Math.min(bounds.minx, x); bounds.miny = Math.min(bounds.miny, y);
  bounds.maxx = Math.max(bounds.maxx, x); bounds.maxy = Math.max(bounds.maxy, y);
  return bounds;
}

export function remapRaster(grid: Grid, ext: RasterExt | null | undefined,
  width: number, height: number, mapPoint: PointMap,
  { wrap = false, preserveGrid = false }: RemapOptions = {}): RemapResult {
  const output = blank(width, height) as unknown as Grid;
  const outside: RasterExt = new Map();
  let bounds: GridBounds | null = null;
  const cells = createRasterCellInterner();
  const copyCell = (cell: Cell): Cell => Object.isFrozen(cell) ? cell : cells.copy(cell);
  const put: CellVisitor = (x, y, cell, fromExt) => {
    let [nx, ny] = mapPoint(x, y);
    if (wrap) {
      nx = ((nx % width) + width) % width;
      ny = ((ny % height) + height) % height;
    }
    const copy = copyCell(cell);
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      const row = output[ny];
      if (row && !(fromExt && preserveGrid && row[nx])) row[nx] = copy;
      bounds = include(bounds, nx, ny);
    } else outside.set(`${nx},${ny}`, copy);
  };
  visitGrid(grid, put);
  for (const [key, cell] of ext ?? []) {
    const [x, y] = parseKey(key); put(x, y, cell, true);
  }
  setGridBounds(output, bounds, true);
  return { grid: output, ext: outside, bounds };
}

export const translateRaster = (grid: Grid, ext: RasterExt | null | undefined,
  dx: number, dy: number, width: number, height: number,
  options?: RemapOptions): RemapResult =>
  remapRaster(grid, ext, width, height, (x, y) => [x + dx, y + dy], options);

export const flipRaster = (grid: Grid, ext: RasterExt | null | undefined,
  width: number, height: number, horizontal: boolean): RemapResult =>
  remapRaster(grid, ext, width, height, (x, y) => horizontal
    ? [width - 1 - x, y] : [x, height - 1 - y]);

export function rotateRasterCentered(grid: Grid, ext: RasterExt | null | undefined,
  width: number, height: number): RemapResult {
  const dx = Math.round((width - height) / 2);
  const dy = Math.round((height - width) / 2);
  return remapRaster(grid, ext, width, height,
    (x, y) => [height - 1 - y + dx, x + dy]);
}
