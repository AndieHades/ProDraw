import type { GridBounds } from "../raster-grid.ts";
import { packedRgbaState } from "./PackedRgbaGrid.ts";
import { PackedRasterExt } from "./PackedRasterExt.ts";

// Альфа-план: один байт на пиксель прямоугольника. Слои сливаются максимумом
// альфы, чтобы связность пятен считалась по общему видимому содержимому, а не
// по каждому слою отдельно. Упакованные строки читаются без ячейки на пиксель.
export interface AlphaPlane {
  readonly minx: number;
  readonly miny: number;
  readonly width: number;
  readonly height: number;
  readonly alpha: Uint8Array;
}

export interface AlphaSource {
  readonly grid: object;
  readonly ext?: Map<string, unknown> | null;
}

export function createAlphaPlane(bounds: GridBounds): AlphaPlane {
  const width = bounds.maxx - bounds.minx + 1, height = bounds.maxy - bounds.miny + 1;
  return { minx: bounds.minx, miny: bounds.miny, width, height,
    alpha: new Uint8Array(width * height) };
}

export function addAlpha(plane: AlphaPlane, x: number, y: number, alpha: number): void {
  const px = x - plane.minx, py = y - plane.miny;
  if (px < 0 || py < 0 || px >= plane.width || py >= plane.height) return;
  const index = py * plane.width + px;
  if (alpha > (plane.alpha[index] ?? 0)) plane.alpha[index] = alpha;
}

export function addAlphaRow(plane: AlphaPlane, y: number, left: number,
  rgba: ArrayLike<number>): void {
  const py = y - plane.miny; if (py < 0 || py >= plane.height) return;
  const from = Math.max(left, plane.minx);
  const to = Math.min(left + rgba.length / 4, plane.minx + plane.width);
  const base = py * plane.width - plane.minx;
  for (let x = from; x < to; x++) {
    const alpha = rgba[(x - left) * 4 + 3] ?? 0;
    if (alpha > (plane.alpha[base + x] ?? 0)) plane.alpha[base + x] = alpha;
  }
}

const cellAlpha = (cell: unknown): number =>
  Array.isArray(cell) ? Number(cell[3] ?? 255) : 0;

function addKeyedCell(plane: AlphaPlane, key: string, cell: unknown): void {
  const comma = key.indexOf(",");
  addAlpha(plane, +key.slice(0, comma), +key.slice(comma + 1), cellAlpha(cell));
}

const index = (key: string): number => {
  const value = Number(key); return Number.isInteger(value) && value >= 0 ? value : -1;
};

// Разреженные и старые плотные сетки обходятся по хранимым строкам и ячейкам:
// пустые строки A4-холста не читаются вовсе.
function addCellRowsAlpha(plane: AlphaPlane, grid: object): void {
  const rows = grid as Record<string, unknown>;
  for (const rowKey of Object.keys(rows)) {
    const y = index(rowKey); if (y < plane.miny || y >= plane.miny + plane.height) continue;
    const row = rows[rowKey]; if (!row || typeof row !== "object") continue;
    const cells = row as Record<string, unknown>;
    for (const cellKey of Object.keys(cells)) {
      const x = index(cellKey); if (x >= 0) addAlpha(plane, x, y, cellAlpha(cells[cellKey]));
    }
  }
}

export function addGridAlpha(plane: AlphaPlane, grid: object): void {
  const packed = packedRgbaState(grid);
  if (!packed) { addCellRowsAlpha(plane, grid); return; }
  for (const [y, row] of packed.rows) addAlphaRow(plane, y, row.left, row.bytes);
}

// ext хранит пиксели за краем холста: упакованные строки и/или ключи "x,y".
export function addExtAlpha(plane: AlphaPlane, ext?: Map<string, unknown> | null): void {
  if (!ext) return;
  if (!(ext instanceof PackedRasterExt)) {
    for (const [key, cell] of ext) addKeyedCell(plane, key, cell);
    return;
  }
  for (const row of ext.spans()) addAlphaRow(plane, row.y, row.left, row.bytes);
  for (const [key, cell] of ext.looseCells()) addKeyedCell(plane, key, cell);
}

export function layersAlphaPlane(layers: readonly AlphaSource[],
  bounds: GridBounds): AlphaPlane {
  const plane = createAlphaPlane(bounds);
  for (const layer of layers) {
    addGridAlpha(plane, layer.grid); addExtAlpha(plane, layer.ext);
  }
  return plane;
}
