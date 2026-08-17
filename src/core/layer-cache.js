// Растеризация слоёв: каждый слой кешируется в canvas W×H, грязь помечается
// markDirty. Здесь же сборка композита — единственная точка композита в проекте.
import { S } from './state.js';
import { effVis, clipBase } from './layers.js';
import { conservativeGridBounds, forgetGridBounds, noteGridBounds, parseKey } from '../logic/raster.js';
import { layerFxSurface, layerPlainSurface,
  layerRenderEffects } from './effects-render.js';
import { paintStack } from './composite.js';
import { makeCanvas, paintCanvas } from './canvas.js';
import { materializeEffectSurface } from './effect-surface.js';
import { clipEffectSurface } from './effect-clip-surface.js';
import { LegacyCompositeDamageTracker } from './render/LegacyCompositeDamage.ts';

let lcs = []; const dirtySet = new Set(), fullDirty = new Set(), dirtyBounds = new Map();
const revs = [], extCache = [];
let generation = 0, contentRev = 0;
const compositeDamage = new LegacyCompositeDamageTracker();
export const markDirty = (i, bounds = null) => {
  dirtySet.add(i);
  compositeDamage.noteLayer(i, bounds);
  const layer = S.layers[i];
  if (!bounds) { fullDirty.add(i); dirtyBounds.delete(i);
    if (layer) forgetGridBounds(layer.grid); }
  else if (!fullDirty.has(i)) {
    const before = dirtyBounds.get(i);
    dirtyBounds.set(i, before ? { minx: Math.min(before.minx, bounds.minx),
      miny: Math.min(before.miny, bounds.miny), maxx: Math.max(before.maxx, bounds.maxx),
      maxy: Math.max(before.maxy, bounds.maxy) } : { ...bounds });
    if (layer) noteGridBounds(layer.grid, bounds);
  }
  revs[i] = (revs[i] || 0) + 1; contentRev++;
};
export function dirtyAll({ preserveGridBounds = false } = {}) { if (!preserveGridBounds) {
    for (const layer of S.layers) forgetGridBounds(layer.grid); }
  lcs = []; extCache.length = 0; dirtySet.clear();
  fullDirty.clear(); dirtyBounds.clear(); revs.length = 0;
  compositeDamage.invalidate(); generation++; contentRev++; }
// версия содержимого слоя i (растёт при правках) — подпись для кеша эффектов
export const layerRev = (i) => generation + ':' + (revs[i] || 0);
export const contentRevision = () => contentRev;
export const contentGeneration = () => generation;
export const takeCompositeDamage = () => compositeDamage.take(S.W, S.H);
export function layerContentBounds(i) {
  const layer = S.layers[i]; if (!layer) return null;
  return conservativeGridBounds(layer.grid);
}
// Common render path consumes bounded effect surfaces. Full materialization is
// retained only as an explicit compatibility/export boundary.
export const layerSrcSurface = (i) => layerRenderEffects(i).length
  ? layerFxSurface(i) : layerFloatCanvas(i);
export const layerSrcCanvas = (i) => materializeEffectSurface(
  layerSrcSurface(i), S.W, S.H);

function rasterRegion(context, grid, bounds) {
  const minx = Math.max(0, bounds.minx), miny = Math.max(0, bounds.miny);
  const maxx = Math.min(S.W - 1, bounds.maxx), maxy = Math.min(S.H - 1, bounds.maxy);
  if (maxx < minx || maxy < miny) return;
  const width = maxx - minx + 1, height = maxy - miny + 1;
  const image = context.createImageData(width, height);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const color = grid[y]?.[x]; if (!color) continue;
    const offset = ((y - miny) * width + x - minx) * 4;
    image.data[offset] = color[0]; image.data[offset + 1] = color[1];
    image.data[offset + 2] = color[2]; image.data[offset + 3] = color.length > 3 ? color[3] : 255;
  }
  context.putImageData(image, minx, miny);
}

export function layerCanvas(i) { let c = lcs[i], rebuild = !c;
  if (!c) { c = makeCanvas(S.W, S.H); lcs[i] = c; dirtySet.add(i); }
  if (c.width !== S.W || c.height !== S.H) { c.width = S.W; c.height = S.H;
    dirtySet.add(i); rebuild = true; }
  if (dirtySet.has(i)) { const context = c.getContext('2d'), grid = S.layers[i].grid;
    const partial = !rebuild && !fullDirty.has(i), bounds = partial
      ? dirtyBounds.get(i) : layerContentBounds(i);
    if (!partial && !rebuild) context.clearRect(0, 0, S.W, S.H);
    if (partial && bounds) context.clearRect(bounds.minx, bounds.miny,
      bounds.maxx - bounds.minx + 1, bounds.maxy - bounds.miny + 1);
    if (bounds) rasterRegion(context, grid, bounds);
    dirtySet.delete(i); fullDirty.delete(i); dirtyBounds.delete(i); }
  return c; }

// запас ext (то, что за краем холста) слоя i, упакованный в canvas по своим
// границам + смещение (ox,oy). Нужен для живого превью Move: заехавшее из-за
// края показываем сразу, а не «обрезанным». null — если запаса нет.
export function layerExtCanvas(i) {
  const L = S.layers[i]; if (!L.ext || !L.ext.size) return null;
  const hit = extCache[i]; if (hit && hit.rev === layerRev(i)) return hit;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of L.ext.keys()) { const [x, y] = parseKey(k);
    if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const c = paintCanvas(w, h, (d) => {
    for (const [k, cc] of L.ext) { const [px, py] = parseKey(k); const o = ((py - minY) * w + (px - minX)) * 4;
      d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = cc.length > 3 ? cc[3] : 255; } });
  const res = { canvas: c, ox: minX, oy: minY, rev: layerRev(i) }; extCache[i] = res; return res; }

// слой i вместе с «висящим» фрагментом выделения (если фрагмент поднят с него):
// обтравка и композит видят фрагмент так, будто он уже лежит в слое
export function layerFloatCanvas(i) {
  const f = S.selFloat; if (!f || (f.li ?? S.cur) !== i) return layerCanvas(i);
  const c = makeCanvas(S.W, S.H);
  const x = c.getContext('2d'); x.drawImage(layerCanvas(i), 0, 0);
  const put = (xx, yy, cc) => { if (xx >= 0 && yy >= 0 && xx < S.W && yy < S.H) {
    x.fillStyle = 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + (cc.length > 3 ? cc[3] : 255) / 255 + ')'; x.fillRect(xx, yy, 1, 1); } };
  if (f.symItems) for (const it of f.symItems) put(it.ax + it.sgnx * f.dx, it.ay + it.sgny * f.dy, it.c);
  else for (const [k, cc] of f.cells) { const [dx, dy] = parseKey(k); put(f.x + dx, f.y + dy, cc); }
  return c; }

// слой i, обрезанный по силуэту базового слоя base (обтравочная маска)
export function clippedCanvas(i, base) { return clippedShift(i, base, 0, 0, 0, 0); }

// то же, но слой и база могут быть сдвинуты раздельно (в пикселях сетки) —
// нужно для живого превью Move: маска едет вместе с базой, а не «застывает»
export function clippedShift(i, base, dix, diy, dbx, dby) {
  const source = layerRenderEffects(i).length ? layerFxSurface(i) : layerPlainSurface(i);
  return clipEffectSurface({ source,
    sourceDx: dix, sourceDy: diy, extra: layerExtCanvas(i),
    mask: layerPlainSurface(base), maskDx: dbx, maskDy: dby,
    documentBounds: { minx: 0, miny: 0, maxx: S.W - 1, maxy: S.H - 1 } }); }

// итоговый цвет точки (x,y) по всем видимым слоям, либо null
export function compositeAt(x, y) { let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) continue; const c = L.grid[y] && L.grid[y][x]; if (!c) continue;
    let la = L.opacity * (c.length > 3 ? c[3] / 255 : 1);
    const cb = clipBase(i); if (L.clip) { const bc = cb >= 0 && effVis(cb) ? S.layers[cb].grid[y][x] : null;
      if (!bc) continue; la *= (bc.length > 3 ? bc[3] / 255 : 1); }
    r = c[0] * la + r * (1 - la); g = c[1] * la + g * (1 - la); b = c[2] * la + b * (1 - la); a = la + a * (1 - la); }
  return a > 0.02 ? [Math.round(r), Math.round(g), Math.round(b)] : null; }

// нарисовать все видимые слои (с эффектами и обтравкой) в произвольный 2D-контекст —
// единственная точка композита; раскладку слой/папка/эффекты держит paintStack.
export function compositeLayers(x) { paintStack(x, false, { bg: true }); }
