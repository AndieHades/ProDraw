// Заливка слоя/папки цветом и приём брошенного на список цвета (на слой, папку
// или поле эффекта). Часть системы слоёв — отдельный модуль ради размера ops.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { snapshot, snapshotEffects } from '../../core/history.js';
import { rgbToHex } from '../../logic/color.ts';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { rasterizeTextTargets } from '../../core/text-rasterize.js';
import { folderLayers } from './helpers.js';
import { snapshotBackground } from './metadata.js';
import { fillRasterTargets, replaceOrFillRasterTargets } from './bulk-pixels.js';
import { fillReferenceTargets,
  replaceOrFillReferenceTargets } from './reference-pixels.js';

const refs = (layers) => layers.filter((layer) => S.layers.includes(layer));
const effectOwner = (effect) => S.layers.find((layer) =>
  (layer.effects || []).includes(effect)) || S.folders.find((folder) =>
  (folder.effects || []).includes(effect));

function legacyReplaceOrFill(layers, color) {
  if (replaceOrFillReferenceTargets(layers, color)) return;
  snapshot(); rasterizeTextTargets(layers);
  const opaque = (cell) => cell && (cell[3] ?? 255) > 0;
  for (const layer of layers) {
    const hasContent = layer.grid.some((row) => row.some(opaque)) ||
      [...(layer.ext?.values() || [])].some(opaque);
    if (hasContent) {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
        const cell = layer.grid[y][x];
        if (opaque(cell)) layer.grid[y][x] = [color[0], color[1], color[2], cell[3] ?? 255];
      }
      for (const [key, cell] of (layer.ext || [])) if (opaque(cell)) {
        layer.ext.set(key, [color[0], color[1], color[2], cell[3] ?? 255]);
      }
    } else {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
        layer.grid[y][x] = [color[0], color[1], color[2], 255];
      }
      layer.ext = new Map();
    }
    markDirty(S.layers.indexOf(layer));
  }
}

export function fillLayerRefs(layers, color) {
  const ts = refs(layers);
  if (!ts.length || !Array.isArray(color) || color.length < 3) return false;
  if (replaceOrFillRasterTargets(ts, color) === null) legacyReplaceOrFill(ts, color);
  actions.run('color.used', color); bus.emitDoc(); return true;
}

export function fillWholeLayerRefs(layers, color) {
  const ts = refs(layers);
  if (!ts.length || !Array.isArray(color) || color.length < 3) return false;
  if (fillRasterTargets(ts, color) === null &&
    fillReferenceTargets(ts, color) === null) {
    snapshot(); const rgba = [color[0], color[1], color[2], 255];
    for (const layer of ts) {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
        layer.grid[y][x] = rgba;
      }
      layer.ext = new Map(); markDirty(S.layers.indexOf(layer));
    }
  }
  actions.run('color.used', color); bus.emitDoc(); return true;
}

export function dropColorAtLayer(color, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const fxrow = el && el.closest ? el.closest('#lay-list .fxrow') : null;
  if (fxrow && fxrow.__eff && fxrow.__eff.params && Object.prototype.hasOwnProperty.call(fxrow.__eff.params, 'color')) {
    const owner = effectOwner(fxrow.__eff); if (!owner || !snapshotEffects(owner)) return false;
    fxrow.__eff.params.color = rgbToHex(color).toLowerCase();
    S.fxCur = fxrow.__eff; S.fxSel = new Set([fxrow.__eff]);
    actions.run('color.used', color); dirtyAll(); bus.emitDoc(); return true;
  }
  const bgr = el && el.closest ? el.closest('#lay-list [data-bg]') : null;
  if (bgr) { snapshotBackground(['color', 'visible']); S.bg.color = [color[0], color[1], color[2]]; S.bg.visible = true; // залить фон-слой любым цветом
    actions.run('color.used', color); S.bgSel = true; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
    dirtyAll(); bus.emitDoc(); return true; }
  const row = el && el.closest ? el.closest('#lay-list .lrow[data-li], #lay-list .lrow[data-fid]') : null;
  if (!row) return false;
  if (row.dataset.li != null) return fillLayerRefs([S.layers[+row.dataset.li]], color);
  const f = S.folders.find((x) => x.id === +row.dataset.fid);
  return f ? fillLayerRefs(folderLayers(f), color) : false;
}

actions.register('layer.dropColorAt', dropColorAtLayer);

// фон-слой Background: залить активным/заданным цветом или очистить (прозрачный)
actions.register('bg.fill', (color) => { const c = color || S.active; if (!Array.isArray(c) || c.length < 3) return;
  snapshotBackground(['color', 'visible']); S.bg.color = [c[0], c[1], c[2]]; S.bg.visible = true; actions.run('color.used', c); bus.emitDoc(); });
actions.register('bg.clear', () => { snapshotBackground(['color', 'visible']); S.bg.color = null; S.bg.visible = true; bus.emitDoc(); });
