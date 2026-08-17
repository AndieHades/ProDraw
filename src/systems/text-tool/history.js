import { snapshotRasterReferences, snapshotStructure } from '../../core/history.js';
import { cloneTextSource } from '../../logic/text-model.js';

export function captureTextLayer(layer) {
  return { name: layer.name, kind: layer.kind,
    text: layer.text ? cloneTextSource(layer.text) : undefined,
    grid: layer.grid, ext: layer.ext };
}

export function restoreTextLayer(layer, state) {
  layer.name = state.name; layer.kind = state.kind;
  if (state.text) layer.text = cloneTextSource(state.text); else delete layer.text;
  layer.grid = state.grid; layer.ext = state.ext;
}

export function commitTextLayerEdit(layer, index, original) {
  const finalState = captureTextLayer(layer);
  restoreTextLayer(layer, original);
  const captured = snapshotRasterReferences([index]);
  restoreTextLayer(layer, finalState);
  return captured;
}

export function snapshotTextLayerRemoval(layer, original) {
  restoreTextLayer(layer, original);
  snapshotStructure();
}
