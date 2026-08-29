// Чистые операции над пиксельной сеткой — размеры берём из самой сетки,
// без DOM и без глобального состояния.
export const parseKey = (k) => { const ci = k.indexOf(','); return [+k.slice(0, ci), +k.slice(ci + 1)]; };
import { gridBounds } from './raster-grid.js';
export { bres, ellipseEdges, ellipseFill, rectEdges,
  rectFill } from './ShapeGeometry.ts';
export { blank, cloneGrid, conservativeGridBounds, forgetGridBounds, gridBounds,
  gridBoundsMetadata, noteGridBounds, setGridBounds } from './raster-grid.js';
export { sparseGridStats } from './sparse-grid-stats.js';

// альфа-смешивание source-over: s поверх d, sa — доп. множитель альфы источника (0..1)
export function blendOver(s, d, sa) {
  const ta = sa * (s.length > 3 ? s[3] / 255 : 1);
  if (!d) return [s[0], s[1], s[2], Math.round(ta * 255)];
  const ba = d.length > 3 ? d[3] / 255 : 1, oa = ta + ba * (1 - ta);
  const f = (sc, dc) => Math.round((sc * ta + dc * ba * (1 - ta)) / oa);
  return [f(s[0], d[0]), f(s[1], d[1]), f(s[2], d[2]), Math.round(oa * 255)];
}

// смешать пиксель t (с непрозрачностью op) поверх b — для слияния слоёв
export const mergeCells = (b, t, op) => (t ? blendOver(t, b, op) : (b ? b.slice() : null));

// охват непрозрачных пикселей RGBA-буфера W×H (или null, если всё прозрачно) —
// общий расчёт границ для Trim/экспорта; учитывает любые запечённые эффекты.
export function alphaBounds(data, W, H, thr = 0) {
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > thr) {
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  return maxx < 0 ? null : { minx, miny, maxx, maxy };
}

// охват с учётом «запасных» пикселей за краем (ext: Map "x,y"→cell) — реальные
// границы слоя, даже если часть вышла за холст. Координаты ext могут быть < 0.
export function boundsWithExt(grid, ext) {
  let b = gridBounds(grid);
  if (ext) for (const k of ext.keys()) { const [x, y] = parseKey(k);
    if (!b) b = { minx: x, miny: y, maxx: x, maxy: y };
    else { if (x < b.minx) b.minx = x; if (x > b.maxx) b.maxx = x; if (y < b.miny) b.miny = y; if (y > b.maxy) b.maxy = y; } }
  return b;
}

// сделать сетку симметричной: зеркалим опорную половину на вторую по осям
export function symmetrizeGrid(g, v, h) {
  const H = g.length, W = g[0].length;
  if (v) for (let y = 0; y < H; y++) for (let x = 0; x < (W >> 1); x++) { const mx = W - 1 - x; g[y][mx] = g[y][x] ? g[y][x].slice() : null; }
  if (h) for (let y = 0; y < (H >> 1); y++) for (let x = 0; x < W; x++) { const my = H - 1 - y; g[my][x] = g[y][x] ? g[y][x].slice() : null; }
}
