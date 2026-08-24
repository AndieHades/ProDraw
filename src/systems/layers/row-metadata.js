import * as bus from '../../core/bus.ts';
import { inlineRename, nameRenameGesture } from '../../core/inline-rename.js';
import { snapshot } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { t } from '../../ui/dom/ShellDom.ts';
import { renameMetadata, toggleSymmetryLock, toggleVisibility } from './metadata.js';

const MASK_ICON = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/>' +
  '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/></svg>';

export function startInlineRename(span, ref, refresh) {
  inlineRename(span, ref.name, (value) => {
    if (value) renameMetadata(ref, value); refresh();
  });
}

export function metadataNameSpan(text, isActive, ref, refresh) {
  const span = document.createElement('span'); span.className = 'lname'; span.textContent = text;
  nameRenameGesture(span, { isActive: () => !!(isActive && isActive()),
    rename: () => startInlineRename(span, ref, refresh) });
  return span;
}

export function wireMetadataVisibility(button, ref) {
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => { event.stopPropagation();
    if (!toggleVisibility(ref)) return;
    button.classList.toggle('off', !ref.visible);
    bus.emit('visibility'); bus.emit('render'); bus.emit('layers');
  });
}

export function wireMetadataSymmetry(button, ref) {
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => { event.stopPropagation();
    if (!toggleSymmetryLock(ref)) return;
    button.classList.toggle('off', ref.symLock); bus.emit('render');
  });
}

export function psdMaskButton(layer, index, rerender) {
  if (!layer.masks?.length) return null;
  const active = layer.masks.some((mask) => !mask.disabled);
  const button = document.createElement('button');
  button.className = `eye lmask${active ? '' : ' off'}`;
  button.innerHTML = MASK_ICON; button.title = t('layer.psdMask');
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.stopPropagation(); snapshot();
    for (const mask of layer.masks) mask.disabled = active;
    markDirty(index); bus.emitDoc(); rerender();
  });
  return button;
}
