import * as bus from '../../core/bus.js';
import { toast, t } from '../../core/dom.js';
import { targetEffectRegion } from '../../core/effects-render.js';
import { snapshotCompound } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { folderChain } from '../../core/layers.js';
import { S } from '../../core/state.js';
import { hexToRgb } from '../../logic/color.js';
import { INNER_EFFECTS } from '../../logic/layer-effects.js';
import { setGridBounds } from '../../logic/raster.js';

function insertAt(target, inner) {
  if (target.grid) {
    const index = S.layers.indexOf(target);
    return { at: inner ? index + 1 : index, fid: target.fid };
  }
  const indices = S.layers.map((layer, index) => (
    folderChain(layer.fid).some((folder) => folder.id === target.id) ? index : -1
  )).filter((index) => index >= 0);
  if (indices.length) return {
    at: inner ? Math.max(...indices) + 1 : Math.min(...indices), fid: target.id,
  };
  const position = Number.isFinite(target.emptyPos)
    ? Math.max(0, Math.min(S.layers.length, target.emptyPos)) : 0;
  return { at: position, fid: target.id };
}

function clearEmptyPosition(fid) {
  for (const folder of folderChain(fid)) delete folder.emptyPos;
}

function sparseLayer(name) {
  const grid = Array.from({ length: S.H }, () => new Array(S.W));
  setGridBounds(grid, null, true);
  return { name, grid, opacity: 1, visible: true, fid: null, clip: false,
    lock: false, alphaLock: false, reference: false, ext: new Map(),
    effects: [], kind: 'pixel' };
}

function writeRegion(layer, region, color) {
  let bounds = null;
  for (const [localX, localY, alpha] of region.pixels) {
    if (!alpha) continue;
    const x = region.bounds.minx + localX, y = region.bounds.miny + localY;
    const cell = [color[0], color[1], color[2], alpha];
    if (x < 0 || y < 0 || x >= S.W || y >= S.H) {
      layer.ext.set(`${x},${y}`, cell); continue;
    }
    layer.grid[y][x] = cell;
    const point = { minx: x, miny: y, maxx: x, maxy: y };
    bounds = bounds ? { minx: Math.min(bounds.minx, x),
      miny: Math.min(bounds.miny, y), maxx: Math.max(bounds.maxx, x),
      maxy: Math.max(bounds.maxy, y) } : point;
  }
  setGridBounds(layer.grid, bounds, true);
}

export function convertFxToLayer(target, effect) {
  if (!target || !effect) return;
  if (['adjustment', 'monochrome'].includes(effect.type)) {
    toast(t('toast.adjustmentNoLayer')); return;
  }
  const effectIndex = (target.effects || []).indexOf(effect);
  if (effectIndex < 0) return;
  const region = targetEffectRegion(target, effect);
  if (!snapshotCompound({ structure: true, effects: [target] })) return;
  const layer = sparseLayer(t(`fx.${effect.type}`));
  if (region) writeRegion(layer, region, hexToRgb(effect.params.color));
  target.effects.splice(effectIndex, 1);
  const placement = insertAt(target, INNER_EFFECTS.has(effect.type));
  layer.fid = placement.fid; S.layers.splice(placement.at, 0, layer);
  clearEmptyPosition(placement.fid); S.cur = placement.at;
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null;
  S.fxSel.clear(); S.fxCur = null; dirtyAll({ preserveGridBounds: true });
  bus.emitDoc(); toast(t('toast.fxToLayer'));
}
