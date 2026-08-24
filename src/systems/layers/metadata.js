// Lightweight history for non-structural layer, folder and background fields.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { snapshotDescriptors, snapshotEffects } from '../../core/history.js';
import { folderChain } from '../../core/layers.js';

function descriptorFor(ref, properties) {
  const index = S.layers.indexOf(ref);
  if (index >= 0) return { kind: 'layer', index, properties };
  if (S.folders.includes(ref)) return { kind: 'folder', id: ref.id, properties };
  return ref === S.bg ? { kind: 'background', properties } : null;
}

export function snapshotMetadata(refs, properties) {
  const list = Array.isArray(refs) ? refs : [refs];
  const descriptors = list.map((ref) => descriptorFor(ref, properties));
  return descriptors.every(Boolean) && snapshotDescriptors(descriptors);
}

function effectOwner(effect) {
  for (const layer of S.layers) if ((layer.effects || []).includes(effect)) return layer;
  return S.folders.find((folder) => (folder.effects || []).includes(effect)) || null;
}

export function snapshotOpacity(ref) {
  const descriptor = descriptorFor(ref, ['opacity']);
  if (descriptor) return snapshotDescriptors(descriptor);
  const owner = effectOwner(ref); return owner ? snapshotEffects(owner) : false;
}

export function renameMetadata(ref, name) {
  if (!name || !snapshotMetadata(ref, ['name'])) return false;
  ref.name = name; return true;
}

function visibilityAncestors(ref) {
  if (S.layers.includes(ref)) return folderChain(ref.fid);
  if (S.folders.includes(ref)) return folderChain(ref.parent);
  return [];
}

export function toggleVisibility(ref) {
  const ancestors = visibilityAncestors(ref);
  const showing = ref.visible === false || ancestors.some((folder) => folder.visible === false);
  const targets = showing ? [ref, ...ancestors] : [ref];
  if (!snapshotMetadata(targets, ['visible'])) return false;
  for (const target of targets) target.visible = showing;
  return true;
}

export function toggleSymmetryLock(ref) {
  if (!snapshotMetadata(ref, ['symLock'])) return false;
  ref.symLock = !ref.symLock; return true;
}

export function toggleLock(layer) { if (!snapshotMetadata(layer, ['lock'])) return;
  layer.lock = !layer.lock; bus.emit('layers'); }
export function toggleAlphaLock(layer) { if (!snapshotMetadata(layer, ['alphaLock'])) return;
  layer.alphaLock = !layer.alphaLock; bus.emit('layers'); }
export function toggleClip(layer) { if (!snapshotMetadata(layer, ['clip'])) return;
  layer.clip = !layer.clip; bus.emitDoc(); }
export function toggleReference(layer) { if (!S.layers.includes(layer)) return;
  if (!snapshotMetadata(S.layers, ['reference'])) return; const on = !layer.reference;
  for (const item of S.layers) item.reference = item === layer && on;
  bus.emit('layers'); }

export const snapshotBackground = (properties) =>
  snapshotDescriptors({ kind: 'background', properties });
export function toggleBackgroundVisibility() {
  if (!snapshotBackground(['visible'])) return false;
  S.bg.visible = !S.bg.visible; return true;
}
