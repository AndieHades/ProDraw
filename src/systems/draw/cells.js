// Низкоуровневая запись клетки: с учётом выделения-маски и осей симметрии.
// setCell — простая запись (заливка), paintCell — кисть с альфа-смешиванием.
import { S, G } from '../../core/state.js';
import { blendOver } from '../../logic/raster.js';
import { symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { rasterizeActiveText } from '../../core/text-rasterize.js';
import { strokeSeen } from './seen.js';
import { recordPixelBefore } from '../../core/history.js';
import brushRaster from '../../config/brush-raster.json' with { type: 'json' };
import { PixelOpacityAccumulator } from '../../logic/brush/PixelOpacityAccumulator.ts';

// Tile Mode: координата заворачивается по модулю холста → рисование по любому из
// 9 тайлов и заворот кисти через шов правят один исходный тайл.
const wrapC = (v, n) => ((v % n) + n) % n;

export function setCell(x, y, c) {
  if (S.tile && S.tile.on) { x = wrapC(x, S.W); y = wrapC(y, S.H); }
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return; // выделение работает как маска
  rasterizeActiveText();
  const L = S.layers[S.cur]; if (L.lock) return; // замок: слой нельзя трогать
  const g = G(); let bounds = null;
  const put = (px, py) => { if (L.alphaLock && !g[py][px]) return;
    recordPixelBefore(S.cur, px, py, g[py][px]); g[py][px] = c ? c.slice() : null;
    bounds = bounds ? { minx: Math.min(bounds.minx, px), miny: Math.min(bounds.miny, py),
      maxx: Math.max(bounds.maxx, px), maxy: Math.max(bounds.maxy, py) }
      : { minx: px, miny: py, maxx: px, maxy: py }; }; // альфа-замок: только по существующим
  for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false, symmetryConfig())) if (inSel(px, py)) put(px, py);
  if (bounds) markDirty(S.cur, bounds);
}

export function createCellPainter(erase, dedupe = false) {
  rasterizeActiveText();
  const layer = S.layers[S.cur], grid = G(), layerIndex = S.cur;
  const symmetry = symmetryConfig(), color = S.active.slice();
  const pending = new PixelOpacityAccumulator(S.W, brushRaster.opacityAccumulatorTileSide);
  const opaqueColor = [color[0], color[1], color[2], 255];
  const symmetric = symmetry.x || symmetry.y || symmetry.d1 || symmetry.d2;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const apply = (x, y, opacity) => {
    const dst = grid[y][x]; if ((layer.alphaLock || erase) && !dst) return;
    recordPixelBefore(layerIndex, x, y, dst);
    if (erase) { const a1 = ((dst.length > 3 ? dst[3] : 255) / 255) * (1 - opacity);
      grid[y][x] = a1 < .04 ? null : [dst[0], dst[1], dst[2], Math.round(a1 * 255)]; }
    else if (opacity >= 1) grid[y][x] = opaqueColor;
    else grid[y][x] = blendOver(color, dst, opacity);
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  };
  const queue = (x, y, opacity) => pending.add(x, y, opacity);
  const paint = (x, y, opacity) => {
    if (layer.lock) return;
    if (S.tile && S.tile.on) { x = wrapC(x, S.W); y = wrapC(y, S.H); }
    if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
    const o = Math.max(0, Math.min(1, opacity)), key = y * S.W + x;
    if (o <= 0) return;
    if (dedupe && o < 1) { if (strokeSeen.has(key)) return; strokeSeen.add(key); }
    if (!symmetric) { queue(x, y, o); return; }
    for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false, symmetry))
      if (inSel(px, py)) queue(px, py, o);
  };
  return { paint, flush() {
    if (pending.size) pending.drain(apply);
    if (maxx >= minx) { markDirty(layerIndex, { minx, miny, maxx, maxy });
      minx = Infinity; miny = Infinity; maxx = -Infinity; maxy = -Infinity; }
  } };
}

export function paintCellOpacity(x, y, erase, opacity, dedupe = false) {
  const painter = createCellPainter(erase, dedupe);
  painter.paint(x, y, opacity); painter.flush();
}

export function paintCell(x, y, erase) { // legacy square/imported stamp
  const brush = S.brushes[erase ? 'eraser' : 'pencil'];
  paintCellOpacity(x, y, erase, brush.op, true);
}
