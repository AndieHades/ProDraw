// Convert To Layer: визуал одного эффекта → отдельный обычный raster-слой рядом
// с источником (слой/папка), сам эффект снимается. Общий pipeline через
// effectLayerPixels (renderEffectOnly) + targetSilhouette — без логики на тип.
import { S, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { folderChain } from '../../core/layers.js';
import { hexToRgb } from '../../logic/color.js';
import { INNER_EFFECTS, effectLayerPixels } from '../../logic/layer-effects.js';
import { targetSilhouette } from '../../core/effects-render.js';
import { toast, t } from '../../core/dom.js';
import { folderInsertIndex, clearFolderEmptyPos } from '../layers/helpers.js';

// позиция нового слоя сохраняет вид: «наружные» эффекты — под источником, внутренние — над
function insertAt(target, inner) {
  if (target.grid) { const si = S.layers.indexOf(target); return { at: inner ? si + 1 : si, fid: target.fid }; }
  const idxs = S.layers.map((L, k) => (folderChain(L.fid).some((f) => f.id === target.id) ? k : -1)).filter((k) => k >= 0);
  const at = idxs.length ? (inner ? Math.max(...idxs) + 1 : Math.min(...idxs)) : folderInsertIndex(target.id);
  return { at, fid: target.id };
}

export function convertFxToLayer(target, eff) { if (!target || !eff) return;
  if (eff.type === 'adjustment') { toast(t('toast.adjustmentNoLayer')); return; }
  const i = (target.effects || []).indexOf(eff); if (i < 0) return; snapshot();
  const W = S.W, H = S.H, col = hexToRgb(eff.params.color);
  const px = effectLayerPixels(targetSilhouette(target), W, H, eff);
  const nl = newLayer(t('fx.' + eff.type), W, H);
  for (const [x, y, a] of px) { if (!a) continue; const c = [col[0], col[1], col[2], a];
    if (x >= 0 && y >= 0 && x < W && y < H) nl.grid[y][x] = c; else nl.ext.set(x + ',' + y, c); } // вне холста — в ext, эффект не обрезается
  target.effects.splice(i, 1); // источник остаётся, эффект снят
  const { at, fid } = insertAt(target, INNER_EFFECTS.has(eff.type)); nl.fid = fid;
  S.layers.splice(at, 0, nl); clearFolderEmptyPos(fid); S.cur = at;
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emitDoc(); toast(t('toast.fxToLayer'));
}
