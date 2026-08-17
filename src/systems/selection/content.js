import { S, G } from '../../core/state.js';
import * as actions from '../../core/actions.ts';
import * as bus from '../../core/bus.ts';
import {
  beginPixelBatch,
  commitPixelPatch,
  recordPixelBefore,
  snapshot,
  snapshotRasterReferences,
} from '../../core/history.js';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { inMask, selectedPoints } from '../../core/selection.js';
import { selectedLayerTargets } from '../../core/targets.js';
import { rasterizeTextTargets } from '../../core/text-rasterize.js';
import { t, toast } from '../../core/dom.js';
import { commitFloat } from './float.js';
import { clearFullSelection, fillFullSelection } from './full-canvas.js';

function clippedContentBounds(index) {
  const bounds = layerContentBounds(index);
  if (!bounds || !S.sel) return null;
  const clipped = {
    minx: Math.max(S.sel.x0, bounds.minx),
    miny: Math.max(S.sel.y0, bounds.miny),
    maxx: Math.min(S.sel.x1, bounds.maxx),
    maxy: Math.min(S.sel.y1, bounds.maxy),
  };
  return clipped.minx <= clipped.maxx && clipped.miny <= clipped.maxy ? clipped : null;
}

export function selHasPixels() {
  if (!S.sel) return false;
  for (const layer of selectedLayerTargets()) {
    const bounds = clippedContentBounds(S.layers.indexOf(layer));
    if (!bounds) continue;
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        if (layer.grid[y][x] && inMask(x, y)) return true;
      }
    }
  }
  return false;
}

function selectionContainsPaint(targets) {
  for (const layer of targets) {
    const bounds = clippedContentBounds(S.layers.indexOf(layer));
    if (!bounds) continue;
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        if (layer.grid[y][x] && inMask(x, y)) return true;
      }
    }
  }
  return false;
}

export function deleteSelContent() {
  commitFloat();
  const targets = selectedLayerTargets();
  if (!selectionContainsPaint(targets)) return false;
  if (clearFullSelection(targets)) {
    bus.emit('render');
    bus.emit('layers');
    return true;
  }
  const indices = targets.map((layer) => S.layers.indexOf(layer));
  const local = indices.every((index) => index >= 0 && S.layers[index].kind === 'pixel') &&
    beginPixelBatch(indices);
  if (!local && !snapshotRasterReferences(indices)) snapshot();
  rasterizeTextTargets(targets);
  for (const layer of targets) {
    const index = S.layers.indexOf(layer);
    const bounds = clippedContentBounds(index);
    if (!bounds) continue;
    let dirty = false;
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        if (!inMask(x, y) || !layer.grid[y][x]) continue;
        if (local) recordPixelBefore(index, x, y, layer.grid[y][x]);
        layer.grid[y][x] = null;
        dirty = true;
      }
    }
    if (dirty) markDirty(index, bounds);
  }
  if (local) commitPixelPatch();
  bus.emit('render');
  bus.emit('layers');
  return true;
}

export function fillSelection() {
  if (!S.sel || !S.layers[S.cur]) return;
  commitFloat();
  if (fillFullSelection()) {
    const count = S.selMask?.size ?? S.W * S.H;
    actions.run('color.used', S.active);
    bus.emit('render');
    bus.emit('layers');
    toast(t('toast.filledN', { n: count }));
    return;
  }
  const local = S.layers[S.cur].kind === 'pixel' && beginPixelBatch([S.cur]);
  if (!local && !snapshotRasterReferences([S.cur])) snapshot();
  rasterizeTextTargets([S.layers[S.cur]]);
  const grid = G();
  const color = [S.active[0], S.active[1], S.active[2], 255];
  let count = 0;
  for (const [x, y] of selectedPoints(S.sel, S.selMask)) {
    if (local) recordPixelBefore(S.cur, x, y, grid[y][x]);
    grid[y][x] = color;
    count++;
  }
  if (local) commitPixelPatch();
  if (count) {
    actions.run('color.used', S.active);
    markDirty(S.cur, {
      minx: S.sel.x0,
      miny: S.sel.y0,
      maxx: S.sel.x1,
      maxy: S.sel.y1,
    });
  }
  bus.emit('render');
  bus.emit('layers');
  toast(t('toast.filledN', { n: count }));
}
