// Структурные операции над холстом-документом (примитив для многих систем).
// Меняет размеры/слои, сдвигает запасные пиксели, сбрасывает выделение.
import { S, blank, newLayer } from './state.js';
import * as bus from './bus.ts';
import { translateRaster } from '../logic/raster-remap.js';
import { isTextLayer, moveTextSource } from '../logic/text-model.js';
import { dirtyAll, markDirty } from './layer-cache.js';
import { applyLayerRemap } from './document-layer-remap.js';
import { effectExpansion, needsEffectExpansion } from './effect-expansion.js';
import { snapshot, snapshotDocumentRemap } from './history.js';
import { t } from '../i18n/index.ts';
import { ZOOM_MIN, ZOOM_MAX } from '../config/limits.ts';
import { expandStoredFrames, cropStoredFrames } from './animation-canvas.js';
import { resizeLegacyView } from '../logic/view/LegacyViewGeometry.ts';

function keepCanvasScreenSize(oldW, oldH, newW, newH) {
  Object.assign(S.view, resizeLegacyView(S.view, oldW, oldH, newW, newH,
    ZOOM_MIN, ZOOM_MAX));
}

function translateLayer(layer, dx, dy, width, height, preserveGrid = false) {
  const raster = translateRaster(layer.grid, layer.ext, dx, dy, width, height,
    { preserveGrid });
  return applyLayerRemap(layer, raster,
    { moveText: (text) => moveTextSource(text, dx, dy) });
}

// добавить пустые ряды/колонки по краям (во все слои); рисунок визуально на месте
export function expandCanvas(pl, pt, pr, pb) {
  if (!(pl || pt || pr || pb)) return;
  const oldW = S.W, oldH = S.H;
  S.W += pl + pr; S.H += pt + pb;
  S.layers.forEach((layer) => translateLayer(layer, pl, pt, S.W, S.H));
  S.view.ox -= pl * S.view.zoom; S.view.oy -= pt * S.view.zoom;
  expandStoredFrames(pl, pt, oldW, oldH, S.W, S.H);
  S.sel = null; bus.emit('selection'); dirtyAll({ preserveGridBounds: true });
}

// при применении эффекта раздвинуть холст ровно настолько, чтобы эффект влез
// по краям (обводка/свечение/тень не обрезались). Без своего snapshot —
// вызывается под общим снимком применения. true — если холст вырос.
export { effectExpansion, needsEffectExpansion };
export function expandForEffects(target) {
  const margin = effectExpansion(target);
  const { pl, pt, pr, pb } = margin;
  if (!(pl || pt || pr || pb)) return false;
  expandCanvas(pl, pt, pr, pb); bus.emitDoc();
  bus.emit('feedback', t('toast.canvasSize', { w: S.W, h: S.H })); return true;
}

// кадрировать холст прямоугольником (может выходить за край — тогда обрезает/
// расширяет); отрезанное уходит в запас ext, чтобы не теряться
export function applyCropRect(x0, y0, x1, y1) {
  if (!snapshotDocumentRemap()) snapshot();
  const oldW = S.W, oldH = S.H;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  S.W = nw; S.H = nh;
  S.layers.forEach((layer) => translateLayer(layer, -x0, -y0,
    nw, nh, true));
  keepCanvasScreenSize(oldW, oldH, nw, nh); S.sel = null;
  cropStoredFrames(x0, y0, oldW, oldH, nw, nh);
  bus.emit('selection'); dirtyAll({ preserveGridBounds: true }); bus.emitDoc();
  bus.emit('feedback', t('toast.canvasSize', { w: S.W, h: S.H }));
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
export function shiftLayerGrid(L, dx, dy, wrap = false) {
  const raster = translateRaster(L.grid, L.ext, dx, dy, S.W, S.H, { wrap });
  L.grid = raster.grid; L.ext = raster.ext;
  if (isTextLayer(L)) L.text = moveTextSource(L.text, dx, dy);
}

// очистить текущий слой; false — если уже пуст
export function clearLayer() {
  const L = S.layers[S.cur]; if (!L) return false;
  const hasPixels = L.grid.some((r) => r.some((c) => c)) || !!L.ext.size;
  if (!hasPixels) return false;
  snapshot();
  L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(S.cur);
  bus.emit('render'); bus.emit('layers'); return true;
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
