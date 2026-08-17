// Поворот содержимого документа на 90° по часовой без изменения размера холста.
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { snapshotDocumentRemap } from '../core/history.js';
import { dirtyAll } from '../core/layer-cache.js';
import { applyLayerRemap, remappedLayer } from '../core/document-layer-remap.js';
import { toast, t } from '../core/dom.js';
import { rotateRasterCentered } from '../logic/raster-remap.js';
import { rotateSelection } from './selection-transform.js';
import { liveFrameId, saveActiveFrame } from '../core/animation.js';

function prepareLayer(layer, preserveIdentity) {
  const raster = rotateRasterCentered(layer.grid, layer.ext, S.W, S.H);
  return preserveIdentity ? applyLayerRemap(layer, raster)
    : remappedLayer(layer, raster);
}

function rotateLayerSet(layers, folders, cur, preserveIdentity = false) {
  const previous = { layers: S.layers, folders: S.folders, cur: S.cur };
  S.layers = preserveIdentity ? layers : layers.map((layer) => prepareLayer(layer, false));
  if (preserveIdentity) S.layers.forEach((layer) => prepareLayer(layer, true));
  S.folders = folders || [];
  S.cur = Math.min(cur || 0, Math.max(0, S.layers.length - 1));
  const rotated = S.layers;
  S.layers = previous.layers; S.folders = previous.folders; S.cur = previous.cur;
  return rotated;
}

function rotateStoredFrames() {
  const animator = S.animator; if (!animator) return;
  const skip = liveFrameId(); animator.frames = { ...animator.frames };
  saveActiveFrame(); const frames = {};
  for (const [id, frame] of Object.entries(animator.frames)) {
    frames[id] = id === skip ? frame : { ...frame,
      layers: rotateLayerSet(frame.layers, frame.folders, frame.cur),
      rev: (frame.rev || 0) + 1 };
  }
  animator.frames = frames;
}

export function rotateCanvas() {
  if (S.sel) { if (rotateSelection()) toast(t('toast.rotated90')); return; }
  if (!snapshotDocumentRemap()) return;
  S.layers = rotateLayerSet(S.layers, S.folders, S.cur, true);
  S.sel = null; S.selMask = null; rotateStoredFrames();
  bus.emit('selection'); dirtyAll({ preserveGridBounds: true });
  bus.emitDoc(); toast(t('toast.rotated90'));
}

actions.register('canvas.rotate', rotateCanvas);
