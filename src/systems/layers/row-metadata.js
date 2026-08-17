import * as bus from '../../core/bus.js';
import { inlineRename, nameRenameGesture } from '../../core/inline-rename.js';
import { renameMetadata, toggleSymmetryLock, toggleVisibility } from './metadata.js';

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
    bus.emit('visibility'); bus.emit('render');
  });
}

export function wireMetadataSymmetry(button, ref) {
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => { event.stopPropagation();
    if (!toggleSymmetryLock(ref)) return;
    button.classList.toggle('off', ref.symLock); bus.emit('render');
  });
}
