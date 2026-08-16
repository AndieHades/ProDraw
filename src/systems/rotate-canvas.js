// Поворот содержимого документа на 90° по часовой без изменения размера холста.
import { S, blank } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { parseKey } from '../logic/raster.js';
import { dirtyAll } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';
import { isTilemap, rasterLayer } from '../core/tilemap.js';
import { rotateSelection, rotateTilemapAll } from './selection-transform.js';
import { liveFrameId, saveActiveFrame } from '../core/animation.js';

function put(L, x, y, c) { if (x >= 0 && y >= 0 && x < S.W && y < S.H) L.grid[y][x] = c; else L.ext.set(x + ',' + y, c); }
function rotPt(x, y) {
  const dx = Math.round((S.W - S.H) / 2), dy = Math.round((S.H - S.W) / 2);
  return [S.H - 1 - y + dx, x + dy];
}
function rotateStoredFrames() {
  if (!S.animator) return;
  const skip = liveFrameId(); saveActiveFrame();
  const live = { layers: S.layers, folders: S.folders, cur: S.cur };
  for (const id of Object.keys(S.animator.frames)) {
    if (id === skip) continue;
    const fr = S.animator.frames[id]; S.layers = fr.layers; S.folders = fr.folders || []; S.cur = Math.min(fr.cur || 0, S.layers.length - 1);
    for (const L of S.layers) {
      if (isTilemap(L)) { rotateTilemapAll(L); continue; }
      const old = L.grid, oldExt = L.ext; L.grid = blank(S.W, S.H); L.ext = new Map();
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (old[y][x]) put(L, ...rotPt(x, y), old[y][x]);
      for (const [k, c] of oldExt) { const [x, y] = parseKey(k); put(L, ...rotPt(x, y), c); }
    }
    fr.rev = (fr.rev || 0) + 1;
  }
  S.layers = live.layers; S.folders = live.folders; S.cur = live.cur;
}

export function rotateCanvas() {
  if (S.sel) { if (rotateSelection()) toast(t('toast.rotated90')); return; }
  snapshot();
  for (const L of S.layers) {
    if (isTilemap(L)) { rotateTilemapAll(L); rasterLayer(S.layers.indexOf(L)); continue; }
    const old = L.grid, oldExt = L.ext; L.grid = blank(S.W, S.H); L.ext = new Map();
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (old[y][x]) put(L, ...rotPt(x, y), old[y][x]);
    for (const [k, c] of oldExt) { const [x, y] = parseKey(k); put(L, ...rotPt(x, y), c); } }
  S.sel = null; S.selMask = null;
  rotateStoredFrames();
  bus.emit('selection'); dirtyAll(); bus.emitDoc(); toast(t('toast.rotated90'));
}

actions.register('canvas.rotate', rotateCanvas);
