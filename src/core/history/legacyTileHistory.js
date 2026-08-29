import { historyCap } from '../../config/limits.ts';
import * as bus from '../bus.ts';
import { markDirty } from '../layer-cache.js';
import { S } from '../state.js';
import { createLegacyTileEntry, trimLegacyTileStack } from './legacyTilePatch.ts';
import { rasterOwnerForLayer } from '../raster/legacyRasterOwner.ts';

let active = null;
const pixelLayer = (layer) => !!layer && (!layer.kind || layer.kind === 'pixel');

function push(entry) {
  S.undoStack.push(entry); const cap = historyCap(S.W * S.H);
  if (S.undoStack.length > cap) S.undoStack.splice(0, S.undoStack.length - cap);
  trimLegacyTileStack(S.undoStack);
  S.redoStack.length = 0; bus.emit('snapshot');
}

export function beginLegacyTileEdit(label, layerIndex = S.cur) {
  if (active) commitLegacyTileEdit();
  const layer = S.layers[layerIndex], owner = rasterOwnerForLayer(layer);
  if (!pixelLayer(layer) || !owner ||
    !owner.beginRasterEdit(label, S.W, S.H)) return false;
  active = { layerIndex, layer, owner, width: S.W, height: S.H }; return true;
}

export const legacyTileEditActive = () => !!active;

export function commitLegacyTileEdit() {
  const edit = active; active = null; if (!edit) return false;
  const changeSet = edit.owner.commitRasterEdit(); if (!changeSet) return false;
  push(createLegacyTileEntry(edit.layerIndex, edit.layer, edit.owner,
    edit.width, edit.height, changeSet)); return true;
}

export function cancelLegacyTileEdit() {
  const edit = active; active = null; if (!edit) return false;
  const changed = edit.owner.cancelRasterEdit();
  if (changed) markDirty(edit.layerIndex); return changed;
}

export function abandonLegacyTileEdit() {
  const edit = active; active = null; if (!edit) return false;
  edit.owner.cancelRasterEdit(); return true;
}
