import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { snapshotStructure } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { makeTextLayer } from '../../core/text-layer.js';
import { TEXT_BOX } from '../../config/text.ts';
import { normalizeTextSource } from '../../logic/text-model.ts';

export const draftTextSource = (prefs, x, y) => normalizeTextSource({
  ...prefs, value: '', box: { ...TEXT_BOX, x, y },
});

export function hitTextLayer(gx, gy) {
  for (let index = S.layers.length - 1; index >= 0; index -= 1) {
    const layer = S.layers[index], box = layer?.text?.box;
    if (layer?.kind === 'text' && layer.visible !== false && box &&
      gx >= box.x && gy >= box.y && gx < box.x + box.w && gy < box.y + box.h) return index;
  }
  return -1;
}

export function selectTextLayer(index) {
  S.cur = index; S.bgSel = false; S.marked.clear(); S.markedFolders.clear();
  S.selFolder = null; S.fxSel.clear(); S.fxCur = null; bus.emit('layers');
}

export function insertTextLayer(name, src, fid = null) {
  snapshotStructure();
  const layer = makeTextLayer(name, S.W, S.H, src, src.box);
  const current = S.layers[S.cur]; layer.fid = fid ?? current?.fid ?? null;
  const at = current ? S.cur + 1 : S.layers.length;
  S.layers.splice(at, 0, layer); selectTextLayer(at); dirtyAll(); bus.emitDoc();
  return layer;
}

export function removeTextLayer(layer) {
  const index = S.layers.indexOf(layer); if (index < 0) return;
  S.layers.splice(index, 1); S.marked.clear(); dirtyAll();
  if (S.layers.length) {
    S.cur = Math.max(0, Math.min(index, S.layers.length - 1)); S.bgSel = false;
  } else { S.cur = 0; S.bgSel = true; }
}
