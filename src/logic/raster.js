// Чистые операции над пиксельной сеткой — размеры берём из самой сетки,
// без DOM и без глобального состояния.
export const parseKey = (k) => { const ci = k.indexOf(','); return [+k.slice(0, ci), +k.slice(ci + 1)]; };

// пустая сетка W×H (все клетки null) — общий конструктор для слоёв и tilemap
export const blank = (w, h) => Array.from({ length: h }, () => new Array(w).fill(null));

// глубокая копия сетки: клетка = [r,g,b,a] или null
export const cloneGrid = (g) => g.map((r) => r.map((c) => (c ? c.slice() : null)));

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

// охватывающий прямоугольник непустых клеток (или null)
export function gridBounds(g) {
  const H = g.length, W = g[0].length; let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) {
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  return maxx < 0 ? null : { minx, miny, maxx, maxy };
}

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

// Брезенхем — обход линии без дырок; cb(x,y) на каждой клетке
export function bres(x0, y0, x1, y1, cb) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (;;) { cb(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}

// контур прямоугольника по углам; cb(x,y) на каждой клетке рамки
export function rectEdges(x0, y0, x1, y1, cb) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
  for (let x = ax; x <= bx; x++) { cb(x, ay); if (by !== ay) cb(x, by); }
  for (let y = ay + 1; y < by; y++) { cb(ax, y); if (bx !== ax) cb(bx, y); }
}

// залитый прямоугольник по углам; cb(x,y) на каждой клетке
export function rectFill(x0, y0, x1, y1, cb) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) cb(x, y);
}

// контур эллипса, вписанного в прямоугольник по углам (алгоритм Цингля);
// cb(x,y) на каждой клетке контура — без дырок
export function ellipseEdges(x0, y0, x1, y1, cb) {
  let a = Math.abs(x1 - x0), b = Math.abs(y1 - y0); const b1 = b & 1;
  let dx = 4 * (1 - a) * b * b, dy = 4 * (b1 + 1) * a * a, err = dx + dy + b1 * a * a;
  if (x0 > x1) { x0 = x1; x1 += a; }
  if (y0 > y1) y0 = y1;
  y0 += (b + 1) >> 1; y1 = y0 - b1;
  a = 8 * a * a; const bsq = 8 * b * b;
  do { cb(x1, y0); cb(x0, y0); cb(x0, y1); cb(x1, y1);
    const e2 = 2 * err;
    if (e2 <= dy) { y0++; y1--; err += dy += a; }
    if (e2 >= dx || 2 * err > dy) { x0++; x1--; err += dx += bsq; }
  } while (x0 <= x1);
  while (y0 - y1 < b) { cb(x0 - 1, y0); cb(x1 + 1, y0++); cb(x0 - 1, y1); cb(x1 + 1, y1--); } // узкие эллипсы (ширина 1-2)
}

// залитый эллипс: по контуру собираем границы строк и заливаем пролёты
export function ellipseFill(x0, y0, x1, y1, cb) { const rows = new Map();
  ellipseEdges(x0, y0, x1, y1, (x, y) => { const r = rows.get(y); if (!r) rows.set(y, [x, x]); else { if (x < r[0]) r[0] = x; if (x > r[1]) r[1] = x; } });
  for (const [y, r] of rows) for (let x = r[0]; x <= r[1]; x++) cb(x, y);
}

// сделать сетку симметричной: зеркалим опорную половину на вторую по осям
export function symmetrizeGrid(g, v, h) {
  const H = g.length, W = g[0].length;
  if (v) for (let y = 0; y < H; y++) for (let x = 0; x < (W >> 1); x++) { const mx = W - 1 - x; g[y][mx] = g[y][x] ? g[y][x].slice() : null; }
  if (h) for (let y = 0; y < (H >> 1); y++) for (let x = 0; x < W; x++) { const my = H - 1 - y; g[my][x] = g[y][x] ? g[y][x].slice() : null; }
}
