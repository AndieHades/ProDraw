// Структурные операции над холстом-документом (примитив для многих систем).
// Меняет размеры/слои, сдвигает запасные пиксели, сбрасывает выделение.
import { S, blank, newLayer } from './state.js';
import * as bus from './bus.js';
import { parseKey, gridBounds } from '../logic/raster.js';
import { isTextLayer, moveTextSource } from '../logic/text-model.js';
import { effectReach } from '../logic/layer-effects.js';
import { folderChain } from './layers.js';
import { dirtyAll, markDirty } from './layer-cache.js';
import { snapshot } from './history.js';
import { toast, t } from './dom.js';
import { MAX_SIZE, ZOOM_MIN, ZOOM_MAX } from '../config/limits.js';
import { isTilemap, rasterLayer, remapToCanvas } from './tilemap.js';
import { expandStoredFrames, cropStoredFrames } from './animation-canvas.js';

function keepCanvasScreenSize(oldW, oldH, newW, newH) {
  const z0 = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number.isFinite(S.view.zoom) ? S.view.zoom : ZOOM_MIN));
  const sw = oldW * z0, sh = oldH * z0;
  const cx = S.view.ox + sw / 2, cy = S.view.oy + sh / 2;
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(sw / newW, sh / newH)));
  S.view.zoom = Number.isFinite(z) ? z : z0;
  S.view.ox = Math.round(cx - (newW * S.view.zoom) / 2);
  S.view.oy = Math.round(cy - (newH * S.view.zoom) / 2);
}

// добавить пустые ряды/колонки по краям (во все слои); рисунок визуально на месте
export function expandCanvas(pl, pt, pr, pb) {
  if (!(pl || pt || pr || pb)) return;
  const oldW = S.W, oldH = S.H;
  S.W += pl + pr; S.H += pt + pb;
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i], g = L.grid, out = [];
    for (let y = 0; y < S.H; y++) { const row = new Array(S.W).fill(null);
      const sy = y - pt; if (sy >= 0 && sy < g.length) for (let x = 0; x < g[sy].length; x++) row[x + pl] = g[sy][x];
      out.push(row); }
    const ne = new Map(); // запасные пиксели за краем: сдвигаем и впитываем попавшие в холст
    for (const [k, c] of L.ext) { const [kx, ky] = parseKey(k), ax = kx + pl, ay = ky + pt;
      if (ax >= 0 && ay >= 0 && ax < S.W && ay < S.H) out[ay][ax] = c; else ne.set(ax + ',' + ay, c); }
    L.grid = out; L.ext = ne; if (isTextLayer(L)) L.text = moveTextSource(L.text, pl, pt);
    if (isTilemap(L)) { remapToCanvas(L, -pl, -pt, S.W, S.H); rasterLayer(i); } }
  S.view.ox -= pl * S.view.zoom; S.view.oy -= pt * S.view.zoom;
  expandStoredFrames(pl, pt, oldW, oldH, S.W, S.H);
  S.sel = null; bus.emit('selection'); dirtyAll();
}

// границы силуэта цели (слой или папка) в координатах холста; null — если пусто
function targetBounds(target) {
  if ('grid' in target) return gridBounds(target.grid);
  let b = null; // папка: объединить границы слоёв поддерева
  for (const L of S.layers) { if (!folderChain(L.fid).some((f) => f.id === target.id)) continue;
    const lb = gridBounds(L.grid); if (!lb) continue;
    b = b ? { minx: Math.min(b.minx, lb.minx), miny: Math.min(b.miny, lb.miny), maxx: Math.max(b.maxx, lb.maxx), maxy: Math.max(b.maxy, lb.maxy) } : lb; }
  return b;
}

// при применении эффекта раздвинуть холст ровно настолько, чтобы эффект влез
// по краям (обводка/свечение/тень не обрезались). Без своего snapshot —
// вызывается под общим снимком применения. true — если холст вырос.
export function expandForEffects(target) {
  if (!target || !target.effects || !target.effects.length) return false;
  const b = targetBounds(target); if (!b) return false;
  const R = effectReach(target.effects);
  const pl = Math.max(0, R.l - b.minx), pt = Math.max(0, R.t - b.miny);
  const pr = Math.max(0, b.maxx + R.r - (S.W - 1)), pb = Math.max(0, b.maxy + R.b - (S.H - 1));
  if (!(pl || pt || pr || pb)) return false;
  expandCanvas(pl, pt, pr, pb); bus.emitDoc();
  toast(t('toast.canvasSize', { w: S.W, h: S.H })); return true;
}

// кадрировать холст прямоугольником (может выходить за край — тогда обрезает/
// расширяет); отрезанное уходит в запас ext, чтобы не теряться
export function applyCropRect(x0, y0, x1, y1) {
  snapshot();
  const oldW = S.W, oldH = S.H;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  for (const L of S.layers) { const ne = new Map();
    const out = Array.from({ length: nh }, () => new Array(nw).fill(null));
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = L.grid[y][x]; if (!c) continue;
      const nx2 = x - x0, ny2 = y - y0;
      if (nx2 >= 0 && ny2 >= 0 && nx2 < nw && ny2 < nh) out[ny2][nx2] = c; else ne.set(nx2 + ',' + ny2, c); }
    for (const [k, c] of L.ext) { const [kx, ky] = parseKey(k), ax = kx - x0, ay = ky - y0;
      if (ax >= 0 && ay >= 0 && ax < nw && ay < nh) { if (!out[ay][ax]) out[ay][ax] = c; } else ne.set(ax + ',' + ay, c); }
    L.grid = out; L.ext = ne; if (isTextLayer(L)) L.text = moveTextSource(L.text, -x0, -y0);
    if (isTilemap(L)) remapToCanvas(L, x0, y0, nw, nh); }
  S.W = nw; S.H = nh; keepCanvasScreenSize(oldW, oldH, nw, nh); S.sel = null;
  cropStoredFrames(x0, y0, oldW, oldH, nw, nh);
  S.layers.forEach((L, i) => { if (isTilemap(L)) rasterLayer(i); });
  bus.emit('selection'); dirtyAll(); bus.emitDoc();
  toast(t('toast.canvasSize', { w: S.W, h: S.H }));
}

// вставить RGBA-картинку w×h новым слоем по центру холста (без snapshot/UI)
export function placeImageLayer(w, h, d) {
  const nl = newLayer(t('layer.imageName'), S.W, S.H); nl.fid = S.layers[S.cur].fid;
  const ox = (S.W - w) >> 1, oy = (S.H - h) >> 1;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const o = (y * w + xx) * 4;
    if (d[o + 3] < 8) continue; nl.grid[oy + y][ox + xx] = [d[o], d[o + 1], d[o + 2], d[o + 3]]; }
  S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear(); dirtyAll(); return nl;
}

// вставить RGBA-картинку w×h САМЫМ ВЕРХНИМ слоем (конец массива), по центру холста;
// то, что не влезло, хранится в ext (реальные границы) — не разрушаем, Trim откроет
export function addImageLayerTop(w, h, d, name) {
  const nl = newLayer(name || t('layer.imageName'), S.W, S.H); nl.fid = null;
  const ox = (S.W - w) >> 1, oy = (S.H - h) >> 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (d[o + 3] < 8) continue;
    const px = ox + x, py = oy + y, c = [d[o], d[o + 1], d[o + 2], d[o + 3]];
    if (px >= 0 && py >= 0 && px < S.W && py < S.H) nl.grid[py][px] = c; else nl.ext.set(px + ',' + py, c); }
  S.layers.push(nl); S.cur = S.layers.length - 1; S.marked.clear(); dirtyAll(); return nl;
}

// сдвинуть содержимое слоя на (dx,dy); ушедшее за край — в запас ext
// wrap — тороидальный сдвиг (Tile Mode): уехавшее за край возвращается с другой
// стороны, ext не копится (тайл самодостаточен).
export function shiftLayerGrid(L, dx, dy, wrap = false) { const ng = blank(S.W, S.H), ne = new Map();
  const put = (x, y, c) => { let nx = x + dx, ny = y + dy;
    if (wrap) { ng[((ny % S.H) + S.H) % S.H][((nx % S.W) + S.W) % S.W] = c; return; }
    if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) ng[ny][nx] = c; else ne.set(nx + ',' + ny, c); };
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = L.grid[y][x]; if (c) put(x, y, c.slice()); }
  for (const [k, c] of L.ext) { const [px, py] = parseKey(k); put(px, py, c.slice()); }
  L.grid = ng; L.ext = ne; if (isTextLayer(L)) L.text = moveTextSource(L.text, dx, dy); }

// очистить текущий слой; false — если уже пуст
export function clearLayer() {
  const L = S.layers[S.cur]; if (!L) return false;
  const hasPixels = L.grid.some((r) => r.some((c) => c)) || !!L.ext.size;
  const hasTiles = isTilemap(L) && L.tilemap.cells.some(Boolean);
  if (!hasPixels && !hasTiles) return false;
  snapshot();
  if (isTilemap(L)) { L.tilemap.cells = new Array(L.tilemap.mapW * L.tilemap.mapH).fill(null); rasterLayer(S.cur); }
  else { L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(S.cur); }
  bus.emit('render'); bus.emit('layers'); return true;
}

export function canvasSizeForTiles(tw, th) {
  const w = Math.max(1, Math.round(tw || 1)), h = Math.max(1, Math.round(th || tw || 1));
  return {
    w: Math.min(MAX_SIZE, Math.max(S.W, Math.ceil(S.W / w) * w)),
    h: Math.min(MAX_SIZE, Math.max(S.H, Math.ceil(S.H / h) * h)),
  };
}

// гарантировать активный пиксельный слой. Когда удалены все слои (остаётся только
// фон), первое рисование авто-создаёт слой. Возвращает активный слой.
export function ensureLayer() {
  if (S.layers.length) { if (!S.layers[S.cur]) S.cur = 0;
    if (S.bgSel) { S.bgSel = false; bus.emit('layers'); } // на фоне не рисуем → активным становится слой, на котором рисуешь
    return S.layers[S.cur]; }
  const nl = newLayer(t('layer.name') + ' 1', S.W, S.H);
  S.layers.push(nl); S.cur = 0; S.bgSel = false; S.marked.clear(); dirtyAll(); bus.emit('layers'); return nl;
}
