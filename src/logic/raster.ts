// Чистые операции над пиксельной сеткой — размеры берём из самой сетки,
// без DOM и без глобального состояния.
export const parseKey = (k: string): [number, number] => {
  const ci = k.indexOf(","); return [+k.slice(0, ci), +k.slice(ci + 1)];
};
import type { GridBounds } from "./raster-grid.ts";
import { gridBounds } from "./raster-grid.ts";
import { rasterExtBounds } from "./raster/rasterExtRegion.ts";

export type RasterCell = number[] | null;
export { bres, ellipseEdges, ellipseFill, rectEdges,
  rectFill } from "./ShapeGeometry.ts";
export { blank, cloneGrid, conservativeGridBounds, forgetGridBounds, gridBounds,
  gridBoundsMetadata, noteGridBounds, setGridBounds } from "./raster-grid.ts";
export { sparseGridStats } from "./sparse-grid-stats.ts";

// альфа-смешивание source-over: s поверх d, sa — доп. множитель альфы источника (0..1)
export function blendOver(s: readonly number[], d: readonly number[] | null,
  sa: number): number[] {
  const sr = s[0] ?? 0, sg = s[1] ?? 0, sb = s[2] ?? 0;
  const ta = sa * (s.length > 3 ? (s[3] ?? 255) / 255 : 1);
  if (!d) return [sr, sg, sb, Math.round(ta * 255)];
  const dr = d[0] ?? 0, dg = d[1] ?? 0, db = d[2] ?? 0;
  const ba = d.length > 3 ? (d[3] ?? 255) / 255 : 1, oa = ta + ba * (1 - ta);
  // без замыкания на пиксель: путь кисти вызывает это на каждый мазок
  const dw = ba * (1 - ta);
  return [Math.round((sr * ta + dr * dw) / oa), Math.round((sg * ta + dg * dw) / oa),
    Math.round((sb * ta + db * dw) / oa), Math.round(oa * 255)];
}

// смешать пиксель t (с непрозрачностью op) поверх b — для слияния слоёв
export const mergeCells = (b: readonly number[] | null,
  t: readonly number[] | null, op: number): number[] | null => (t ? blendOver(t, b, op) : (b ? b.slice() : null));

// охват непрозрачных пикселей RGBA-буфера W×H (или null, если всё прозрачно) —
// общий расчёт границ для Trim/экспорта; учитывает любые запечённые эффекты.
export function alphaBounds(data: ArrayLike<number>, W: number, H: number,
  thr = 0): GridBounds | null {
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((data[(y * W + x) * 4 + 3] ?? 0) > thr) {
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  return maxx < 0 ? null : { minx, miny, maxx, maxy };
}

// охват с учётом «запасных» пикселей за краем (ext: Map "x,y"→cell) — реальные
// границы слоя, даже если часть вышла за холст. Координаты ext могут быть < 0.
export function boundsWithExt(grid: object,
  ext?: Map<string, unknown> | null): GridBounds | null {
  const b = gridBounds(grid), outside = rasterExtBounds(ext);
  if (!b || !outside) return b ?? outside;
  return { minx: Math.min(b.minx, outside.minx), miny: Math.min(b.miny, outside.miny),
    maxx: Math.max(b.maxx, outside.maxx), maxy: Math.max(b.maxy, outside.maxy) };
}

// сделать сетку симметричной: зеркалим опорную половину на вторую по осям
export function symmetrizeGrid(g: RasterCell[][], v: boolean, h: boolean): void {
  const H = g.length, W = g[0]?.length ?? 0;
  const copy = (from: RasterCell): RasterCell => from ? from.slice() : null;
  if (v) for (let y = 0; y < H; y++) for (let x = 0; x < (W >> 1); x++) {
    const row = g[y]; if (row) row[W - 1 - x] = copy(row[x] ?? null); }
  if (h) for (let y = 0; y < (H >> 1); y++) for (let x = 0; x < W; x++) {
    const source = g[y], target = g[H - 1 - y];
    if (source && target) target[x] = copy(source[x] ?? null); }
}
