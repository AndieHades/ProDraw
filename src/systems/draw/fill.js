// Заливка связной области (4-связность) с учётом выделения-маски.
import { S, G, blank } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { beginPixelBatch, commitPixelPatch, recordPixelBefore,
  snapshot, snapshotDescriptors, snapshotRasterReferences } from '../../core/history.js';
import { eqc } from '../../logic/color.js';
import { visitFloodRegion } from '../../logic/flood.js';
import { inSel } from '../../core/selection.js';
import { referenceIndexFor, symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.js';
import { $ } from '../../ui/dom/ShellDom.ts';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { rasterizeActiveText } from '../../core/text-rasterize.js';
import { isTextLayer } from '../../logic/text-model.js';

function floodFrom(x, y, paint) {
  const wrap = !!(S.tile && S.tile.on);
  if (wrap) { x = ((x % S.W) + S.W) % S.W; y = ((y % S.H) + S.H) % S.H; } // Tile Mode: точка по любому тайлу → исходный
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return;
  const g = G(), ri = referenceIndexFor(S.cur), src = ri >= 0 ? S.layers[ri].grid : g, target = src[y][x], to = S.active;
  if (src === g && eqc(target, to)) return;
  visitFloodRegion(src, x, y, inSel, paint, wrap);
}

function floodPainter() {
  rasterizeActiveText(); const layer = S.layers[S.cur], grid = G(), index = S.cur;
  const color = S.active.slice(0, 3); let bounds = null;
  const paint = (x, y) => { const before = grid[y][x];
    if (layer.lock || (layer.alphaLock && !before)) return;
    recordPixelBefore(index, x, y, before); grid[y][x] = color;
    bounds = bounds ? { minx: Math.min(bounds.minx, x), miny: Math.min(bounds.miny, y),
      maxx: Math.max(bounds.maxx, x), maxy: Math.max(bounds.maxy, y) }
      : { minx: x, miny: y, maxx: x, maxy: y };
  };
  return { paint, flush: () => { if (bounds) markDirty(index, bounds); } };
}

// заливка с учётом симметрии: регион под точкой и его зеркала (как у кисти)
export function flood(x, y) {
  if (S.bgSel) { S.bg.color = [S.active[0], S.active[1], S.active[2]]; S.bg.visible = true; return; } // выбран фон → заливаем его (снимок/перерисовку делает вызывающий)
  const painter = floodPainter();
  for (const [mx, my] of mirrorPoints(x, y, S.W, S.H, false, false, symmetryConfig())) floodFrom(mx, my, painter.paint);
  painter.flush(); }

function fillBlankCanvasLayer(x, y) {
  const index = S.cur, layer = S.layers[index];
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || S.sel || S.selMask ||
    !layer || (layer.kind && layer.kind !== 'pixel') || layer.lock ||
    layer.alphaLock || layer.ext?.size || referenceIndexFor(index) >= 0 ||
    layerContentBounds(index)) return false;
  if (!snapshotRasterReferences([index])) return false;
  const color = S.active.slice(0, 3), grid = blank(S.W, S.H);
  for (const row of grid) row.fill(color);
  layer.grid = grid; markDirty(index); return true;
}

// заливка как самостоятельное действие (снимок + перерисовка) — для drop-to-fill
export function floodAt(x, y) {
  if (S.bgSel) snapshotDescriptors({ kind: 'background', properties: ['color', 'visible'] });
  else if (fillBlankCanvasLayer(x, y)) { actions.run('color.used', S.active);
    bus.emit('render'); bus.emit('layers'); return; }
  else if (isTextLayer(S.layers[S.cur])) {
    if (!snapshotRasterReferences([S.cur])) snapshot();
  }
  else if (!beginPixelBatch([S.cur])) snapshot();
  flood(x, y); commitPixelPatch(); actions.run('color.used', S.active);
  bus.emit('render'); bus.emit('layers'); }
actions.register('edit.floodAt', floodAt);

// бросили цвет (палитра/кружок) на холст: есть выделение — заливаем его целиком,
// иначе — заливка связной области под точкой (пустой слой, замкнутый контур).
// Координаты — client-пиксели указателя (одинаково для мыши и тача).
export function dropColorAt(color, clientX, clientY) {
  const cv = $('cv'); if (document.elementFromPoint(clientX, clientY) !== cv) return;
  S.active = color.slice(); bus.emit('palette'); bus.emit('color-sync');
  if (S.bgSel) { floodAt(0, 0); return; } // выбран фон → бросок цвета на холст красит фон
  if (S.sel) { actions.run('selection.fill'); return; }
  const r = cv.getBoundingClientRect();
  const gx = Math.floor((clientX - r.left - S.view.ox) / S.view.zoom), gy = Math.floor((clientY - r.top - S.view.oy) / S.view.zoom);
  if (gx >= 0 && gy >= 0 && gx < S.W && gy < S.H) floodAt(gx, gy);
}
actions.register('edit.dropColorAt', dropColorAt);
