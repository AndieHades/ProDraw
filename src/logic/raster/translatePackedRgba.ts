// Быстрый перенос упакованного растра: строка целиком уезжает на (dx,dy), байты
// копируются одним срезом, результат остаётся упакованным. Общий remapRaster
// разворачивал бы каждый непрозрачный пиксель в отдельный массив — на слоях
// PSD это миллионы аллокаций и подвисание на обрезке холста.
import type { PackedRgbaGridRecord,
  PackedRgbaRowRecord } from "../../contracts/packedRgbaGrid.ts";
import type { GridBounds } from "../raster-grid.ts";
import { createRasterCellInterner,
  type RasterCellInterner } from "../raster-cell-interner.ts";
import { createPackedRgbaGrid, packedRgbaState } from "./PackedRgbaGrid.ts";

type Cell = readonly number[];
export interface PackedTranslation {
  readonly grid: unknown[];
  readonly ext: Map<string, Cell>;
  readonly bounds: GridBounds | null;
}

// Отрезанное поле часто одноцветное, поэтому в запас кладём общую ячейку на
// цвет — как и общий путь, иначе кайма съедает память отдельным массивом на пиксель.
const cellAt = (cells: RasterCellInterner, bytes: Uint8ClampedArray,
  offset: number): Cell => cells.rgba(bytes[offset] ?? 0, bytes[offset + 1] ?? 0,
  bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);

// Опорная строка на новом месте: то, что осталось на холсте, — плотным срезом,
// уехавшее за край — поштучно в запас ext (как и в общем пути).
function shiftRow(bytes: Uint8ClampedArray, startX: number, y: number,
  width: number, onCanvas: boolean, known: number, outside: Map<string, Cell>,
  cells: RasterCellInterner): PackedRgbaRowRecord | null {
  const count = bytes.length / 4;
  const from = onCanvas ? Math.max(0, -startX) : count;
  const to = onCanvas ? Math.min(count, width - startX) : count;
  // Строка целиком на холсте и уже плотная (края непрозрачны) — копируем байты
  // как есть: ни один пиксель не уезжает в ext, охват и счётчик уже известны.
  if (from === 0 && to === count && bytes[3] && bytes[count * 4 - 1])
    return { y, left: startX, bytes: bytes.slice(), opaquePixels: known };
  let first = -1, last = -1, opaquePixels = 0;
  for (let index = 0; index < count; index++) {
    const offset = index * 4;
    if (!bytes[offset + 3]) continue;
    if (index >= from && index < to) {
      if (first < 0) first = index;
      last = index; opaquePixels++;
    } else outside.set(`${startX + index},${y}`, cellAt(cells, bytes, offset));
  }
  return first < 0 ? null : { y, left: startX + first,
    bytes: bytes.slice(first * 4, (last + 1) * 4), opaquePixels };
}

// Запас за краем переносится поштучно: он мал по сравнению с самим растром.
function mergeExt(grid: unknown[], ext: Iterable<[string, Cell]> | null | undefined,
  dx: number, dy: number, width: number, height: number, preserveGrid: boolean,
  outside: Map<string, Cell>, cells: RasterCellInterner): void {
  const state = packedRgbaState(grid); if (!state || !ext) return;
  for (const [key, cell] of ext) {
    const comma = key.indexOf(",");
    const x = +key.slice(0, comma) + dx, y = +key.slice(comma + 1) + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) {
      outside.set(`${x},${y}`, Object.isFrozen(cell) ? cell : cells.copy(cell));
      continue;
    }
    if (preserveGrid && state.cell(x, y)) continue;
    state.set(x, y, cell);
  }
}

export function translatePackedRgba(grid: unknown,
  ext: Iterable<[string, Cell]> | null | undefined, dx: number, dy: number,
  width: number, height: number, preserveGrid: boolean): PackedTranslation | null {
  const state = packedRgbaState(grid); if (!state) return null;
  const rows: PackedRgbaRowRecord[] = [], outside = new Map<string, Cell>();
  const cells = createRasterCellInterner();
  let opaquePixels = 0, minx = width, miny = height, maxx = -1, maxy = -1;
  for (const [y, row] of state.rows) {
    const target = y + dy;
    const next = shiftRow(row.bytes, row.left + dx, target, width,
      target >= 0 && target < height, row.opaquePixels, outside, cells);
    if (!next) continue;
    rows.push(next); opaquePixels += next.opaquePixels;
    minx = Math.min(minx, next.left); miny = Math.min(miny, target);
    maxx = Math.max(maxx, next.left + next.bytes.length / 4 - 1);
    maxy = Math.max(maxy, target);
  }
  const record: PackedRgbaGridRecord = { format: "rgba-rows-v1", width, height,
    rows, bounds: maxx < 0 ? null : { minx, miny, maxx, maxy }, opaquePixels };
  const output = createPackedRgbaGrid(record); if (!output) return null;
  mergeExt(output, ext, dx, dy, width, height, preserveGrid, outside, cells);
  return { grid: output, ext: outside,
    bounds: packedRgbaState(output)?.bounds() ?? null };
}
