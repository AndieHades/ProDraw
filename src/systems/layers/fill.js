// Заливка слоя/папки цветом и приём брошенного на список цвета (на слой, папку
// или поле эффекта). Часть системы слоёв — отдельный модуль ради размера ops.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { rgbToHex } from '../../logic/color.js';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { rasterizeTextTargets } from '../../core/text-rasterize.js';
import { folderLayers } from './helpers.js';

export function fillLayerRefs(layers, color) {
  const ts = layers.filter((L) => S.layers.includes(L));
  if (!ts.length || !Array.isArray(color) || color.length < 3) return false;
  snapshot(); rasterizeTextTargets(ts); const a = [color[0], color[1], color[2], 255];
  for (const L of ts) {
    let hasContent = false;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
      const c = L.grid[y][x]; if (c && (c[3] ?? 255) > 0) hasContent = true;
    }
    if (!hasContent && L.ext) for (const c of L.ext.values()) if (c && (c[3] ?? 255) > 0) { hasContent = true; break; }
    if (hasContent) {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
        const c = L.grid[y][x]; if (c && (c[3] ?? 255) > 0) L.grid[y][x] = [a[0], a[1], a[2], c[3] ?? 255];
      }
      if (L.ext) for (const [k, c] of L.ext) if (c && (c[3] ?? 255) > 0) L.ext.set(k, [a[0], a[1], a[2], c[3] ?? 255]);
    } else {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) L.grid[y][x] = a.slice();
      L.ext = new Map();
    }
    markDirty(S.layers.indexOf(L));
  }
  actions.run('color.used', color); bus.emitDoc(); return true;
}

export function dropColorAtLayer(color, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const fxrow = el && el.closest ? el.closest('#lay-list .fxrow') : null;
  if (fxrow && fxrow.__eff && fxrow.__eff.params && Object.prototype.hasOwnProperty.call(fxrow.__eff.params, 'color')) {
    snapshot(); fxrow.__eff.params.color = rgbToHex(color).toLowerCase();
    S.fxCur = fxrow.__eff; S.fxSel = new Set([fxrow.__eff]);
    actions.run('color.used', color); dirtyAll(); bus.emitDoc(); return true;
  }
  const bgr = el && el.closest ? el.closest('#lay-list [data-bg]') : null;
  if (bgr) { snapshot(); S.bg.color = [color[0], color[1], color[2]]; S.bg.visible = true; // залить фон-слой любым цветом
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
  snapshot(); S.bg.color = [c[0], c[1], c[2]]; S.bg.visible = true; actions.run('color.used', c); bus.emitDoc(); });
actions.register('bg.clear', () => { snapshot(); S.bg.color = null; S.bg.visible = true; bus.emitDoc(); });
