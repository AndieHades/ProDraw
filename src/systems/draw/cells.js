// Low-level selected/symmetric raster writes through the typed live owner.
import { S } from '../../core/state.js';
import { blendOver } from '../../logic/raster.js';
import { symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.ts';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { rasterizeActiveText } from '../../core/text-rasterize.js';
import { pixelPatchActive, recordPixelBefore } from '../../core/history.js';
import { rasterOwnerForLayer } from '../../core/raster/legacyRasterOwner.ts';
import { wrapTilePoint } from '../../logic/TileGeometry.ts';
import brushRaster from '../../config/brush-raster.json' with { type: 'json' };
import { PixelOpacityAccumulator } from '../../logic/brush/PixelOpacityAccumulator.ts';

const cellWrite = (x, y, value) => ({ x, y, value,
  red: value?.[0] ?? 0, green: value?.[1] ?? 0, blue: value?.[2] ?? 0,
  alpha: value ? value[3] ?? 255 : 0 });

export function setCell(x, y, c) {
  if (S.tile && S.tile.on) [x, y] = wrapTilePoint(x, y, S.W, S.H);
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  rasterizeActiveText();
  const L = S.layers[S.cur], owner = rasterOwnerForLayer(L);
  if (!owner || L.lock) return;
  let bounds = null;
  const put = (px, py) => { const before = owner.getCell(px, py);
    if (L.alphaLock && !before) return;
    recordPixelBefore(S.cur, px, py, before);
    owner.setCell(px, py, c ? c.slice() : null);
    bounds = bounds ? { minx: Math.min(bounds.minx, px),
      miny: Math.min(bounds.miny, py), maxx: Math.max(bounds.maxx, px),
      maxy: Math.max(bounds.maxy, py) }
      : { minx: px, miny: py, maxx: px, maxy: py }; };
  for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false,
    symmetryConfig())) if (inSel(px, py)) put(px, py);
  if (bounds) markDirty(S.cur, bounds);
}

export function createCellPainter(erase) {
  rasterizeActiveText();
  const layer = S.layers[S.cur], owner = rasterOwnerForLayer(layer), layerIndex = S.cur;
  if (!owner) return { paint() {}, reset() {}, flush() {} };
  const grid = owner.grid;
  const symmetry = symmetryConfig(), color = S.active.slice(), base = new Map();
  const recordsPixelHistory = pixelPatchActive();
  const pending = new PixelOpacityAccumulator(S.W, brushRaster.opacityAccumulatorTileSide);
  const writes = [];
  const opaqueColor = [color[0], color[1], color[2], 255];
  const symmetric = symmetry.x || symmetry.y || symmetry.d1 || symmetry.d2;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const apply = (x, y, opacity) => {
    const key = y * S.W + x;
    let dst = base.get(key);
    if (dst === undefined) { const cell = grid[y][x];
      dst = cell ? cell.slice() : null; base.set(key, dst); }
    if ((layer.alphaLock || erase) && !dst) return;
    if (recordsPixelHistory) recordPixelBefore(layerIndex, x, y, dst);
    let value;
    if (erase) { const a1 = ((dst.length > 3 ? dst[3] : 255) / 255) * (1 - opacity);
      value = a1 < .04 ? null : [dst[0], dst[1], dst[2], Math.round(a1 * 255)]; }
    else value = opacity >= 1 ? opaqueColor : blendOver(color, dst, opacity);
    grid[y][x] = value;
    writes.push(cellWrite(x, y, value));
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  };
  const paint = (x, y, opacity) => {
    if (layer.lock) return;
    if (S.tile && S.tile.on) [x, y] = wrapTilePoint(x, y, S.W, S.H);
    if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
    const amount = Math.max(0, Math.min(1, opacity)); if (amount <= 0) return;
    if (!symmetric) { pending.add(x, y, amount); return; }
    for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false, symmetry))
      if (inSel(px, py)) pending.add(px, py, amount);
  };
  const dirty = () => { if (maxx >= minx) {
    markDirty(layerIndex, { minx, miny, maxx, maxy });
    minx = Infinity; miny = Infinity; maxx = -Infinity; maxy = -Infinity;
  } };
  return { paint, reset() {
    for (const [key, cell] of base) { const x = key % S.W, y = Math.floor(key / S.W);
      writes.push(cellWrite(x, y, cell ? cell.slice() : null));
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y; }
    for (const write of writes) grid[write.y][write.x] = write.value;
    owner.setPreparedCells(writes); writes.length = 0;
    base.clear(); pending.clear(); dirty();
  }, flush() {
    pending.visitDirty(apply, (minX, minY, maxX, maxY) =>
      owner.prepareRegion(minX, minY, maxX, maxY));
    owner.setPreparedCells(writes); writes.length = 0; dirty();
  } };
}

export function paintCellOpacity(x, y, erase, opacity) {
  const painter = createCellPainter(erase); painter.paint(x, y, opacity); painter.flush();
}
export function paintCell(x, y, erase, opacity = 1) {
  paintCellOpacity(x, y, erase, opacity);
}
