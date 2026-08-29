// Замена цвета по всему документу. Палитра сохраняет исходные цвета; новый цвет
// добавляется в конец, если его там ещё нет.
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { beginPixelBatch, commitPixelPatch, recordPixelBefore,
  snapshot, snapshotRasterReferences } from '../core/history.js';
import { eqc } from '../logic/color.ts';
import { dirtyAll, layerContentBounds, markDirty } from '../core/layer-cache.js';
import { toast, t } from '../ui/dom/ShellDom.ts';
import { rasterizeMatchingText } from '../core/text-rasterize.js';
import { isTextLayer } from '../logic/text-model.ts';
import { forkRasterRows } from '../logic/raster-row-fork.js';

const fromList = (from) => (Array.isArray(from && from[0]) ? from : [from]).filter(Boolean).map((c) => c.slice(0, 3));

function beginReferenceEdit(matches) {
  const indices = S.layers.map((_, index) => index);
  if (!indices.length || S.layers.some((layer) =>
    !isTextLayer(layer) && layer.kind && layer.kind !== 'pixel') ||
    !snapshotRasterReferences(indices)) return null;
  const text = new Set(indices.filter((index) => isTextLayer(S.layers[index])));
  rasterizeMatchingText((_layer, index) => text.has(index));
  const forks = new Map();
  for (const index of indices) {
    const layer = S.layers[index];
    if (!text.has(index)) { const fork = forkRasterRows(layer.grid,
        layerContentBounds(index));
      layer.grid = fork.grid; forks.set(index, fork); }
    if ([...layer.ext.values()].some(matches)) layer.ext = new Map(layer.ext);
  }
  return forks;
}

export function recolorAll(from, to) {
  const sources = fromList(from), target = to.slice(0, 3);
  if (!sources.length) return;
  const matches = (cell) => cell && sources.some((source) => eqc(cell, source));
  const indices = S.layers.map((_, index) => index);
  const canPatch = S.layers.every((layer) => (!layer.kind || layer.kind === 'pixel') &&
    ![...layer.ext.values()].some(matches));
  const local = canPatch && beginPixelBatch(indices);
  const forks = local ? null : beginReferenceEdit(matches);
  if (!local && !forks) { snapshot(); rasterizeMatchingText(() => true); }
  let n = 0;
  for (let index = 0; index < S.layers.length; index++) { const L = S.layers[index], g = L.grid;
    const bounds = layerContentBounds(index); let changed = null;
    if (bounds) for (let y = bounds.miny; y <= bounds.maxy; y++) for (let x = bounds.minx; x <= bounds.maxx; x++) {
      if (!matches(g[y][x])) continue;
      if (local) recordPixelBefore(index, x, y, g[y][x]);
      const row = forks?.get(index)?.writableRow(y) || g[y];
      row[x] = target.slice(); n++;
      changed = changed ? { minx: Math.min(changed.minx, x), miny: Math.min(changed.miny, y),
        maxx: Math.max(changed.maxx, x), maxy: Math.max(changed.maxy, y) }
        : { minx: x, miny: y, maxx: x, maxy: y };
    }
    for (const [k, c] of L.ext) if (matches(c)) L.ext.set(k, target.slice());
    if (changed) markDirty(index, changed);
  }
  if (!S.palette.some((p) => eqc(p, target))) S.palette.push(target.slice());
  if (sources.some((f) => eqc(S.active, f))) S.active = target.slice();
  if (n) actions.run('color.used', target);
  if (local) commitPixelPatch(); else dirtyAll({ preserveGridBounds: !!forks });
  bus.emit('palette'); bus.emit('render'); bus.emit('layers');
  toast(t('toast.recoloredN', { n }));
}

export function startReplace(from) { S.replaceMode = { from: Array.isArray(from && from[0]) ? from.map((c) => c.slice()) : from.slice() }; bus.emit('render'); toast(t('toast.replaceHint')); }

actions.register('recolor.all', recolorAll);
actions.register('recolor.start', startReplace);
