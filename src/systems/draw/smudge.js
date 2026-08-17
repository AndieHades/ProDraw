// Палец: переносит цвет вдоль штриха активной кистью и уважает её форму,
// Grain, Scatter, непрозрачность, выделение, alpha lock и Tile Mode.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { ensureLayer } from '../../core/document.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { rasterizeActiveText } from '../../core/text-rasterize.js';
import { blendOver, bres } from '../../logic/raster.js';
import { brushStampWith } from './brush.js';
import { beginStroke, afterStroke, cancelStroke } from './stroke.js';
import { recordPixelBefore } from '../../core/history.js';

let carried = null, last = null, dirty = null;
const wrap = (value, size) => ((value % size) + size) % size;
const sameCell = (a, b) => a === b || (!!a && !!b && a.length === b.length &&
  a.every((value, index) => value === b[index]));
function noteDirty(x, y) {
  if (!dirty) dirty = { minx: x, miny: y, maxx: x, maxy: y };
  else { if (x < dirty.minx) dirty.minx = x; if (x > dirty.maxx) dirty.maxx = x;
    if (y < dirty.miny) dirty.miny = y; if (y > dirty.maxy) dirty.maxy = y; }
}
function flushDirty() { if (!dirty) return;
  markDirty(S.cur, dirty); dirty = null; }
function point(x, y) {
  if (S.tile && S.tile.on) return [wrap(x, S.W), wrap(y, S.H)];
  return [x, y];
}
function sample(x, y) {
  [x, y] = point(x, y);
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return null;
  const cell = G()[y][x]; return cell ? cell.slice() : null;
}
function paint(x, y) {
  if (!carried) return;
  [x, y] = point(x, y);
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  rasterizeActiveText();
  const layer = S.layers[S.cur], grid = G(), current = grid[y][x];
  if (layer.lock || (layer.alphaLock && !current)) return;
  const settings = (S.stampBrush.pencil && S.stampBrush.pencil.smudge) ||
    { flow: 0.72, pickup: 0.28, pull: 0.86 };
  const opacity = Math.max(0, Math.min(1,
    settings.flow * settings.pull * S.brushes.pencil.op));
  const next = blendOver(carried, current, opacity);
  if (sameCell(current, next)) return;
  recordPixelBefore(S.cur, x, y, current);
  grid[y][x] = next; noteDirty(x, y);
}
function dab(x, y) {
  const picked = sample(x, y);
  const settings = (S.stampBrush.pencil && S.stampBrush.pencil.smudge) ||
    { flow: 0.72, pickup: 0.28, pull: 0.86 };
  if (picked) carried = carried ? blendOver(picked, carried, settings.pickup) : picked;
  brushStampWith(x, y, 'pencil', paint);
}

export const smudge = {
  down({ gx, gy }) {
    ensureLayer(); beginStroke(S.layers[S.cur]?.kind === 'pixel'); dirty = null;
    carried = sample(gx, gy); dab(gx, gy); flushDirty(); last = [gx, gy]; bus.emit('render');
  },
  move({ gx, gy }) {
    if (last) bres(last[0], last[1], gx, gy, dab); else dab(gx, gy);
    flushDirty(); last = [gx, gy]; bus.emit('render');
  },
  up() {
    flushDirty(); S.stroke = false; carried = null; last = null;
    afterStroke(); bus.emit('render');
  },
  cancel() { dirty = null; carried = null; last = null; cancelStroke(); bus.emit('render'); },
};
