import { S } from '../../core/state.js';
import * as actions from '../../core/actions.ts';
import { snapshotRasterReferences } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { textDamageBounds, updateTextLayerGrid } from '../../core/text-layer.js';

export function snapshotTextChange(layer, index = S.layers.indexOf(layer)) {
  if (!layer || index < 0) return false;
  if (actions.run('text.ownsEditHistory', layer)) return true;
  return snapshotRasterReferences([index]);
}

export function applyTextChange(layer, patch, fonts, history = true) {
  const index = S.layers.indexOf(layer), before = layer.text;
  if (history) snapshotTextChange(layer, index);
  layer.text = { ...layer.text, ...patch };
  updateTextLayerGrid(layer, S.W, S.H, fonts, before);
  markDirty(index, textDamageBounds(before, layer.text, S.W, S.H));
}
