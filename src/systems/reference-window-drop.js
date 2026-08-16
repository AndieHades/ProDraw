import { $, toast, t } from '../core/dom.js';

const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;
export const isImageFile = (f) => f && (((f.type || '').startsWith('image/')) || IMG_EXT.test(f.name || ''));
const hasFiles = (e) => e.dataTransfer && ([...(e.dataTransfer.types || [])].includes('Files') || (e.dataTransfer.files && e.dataTransfer.files.length));
const imageFiles = (e) => [...(e.dataTransfer && e.dataTransfer.files || [])].filter(isImageFile);
const resetGlobalDrop = () => window.dispatchEvent(new window.CustomEvent('pxh:drop-reset'));

export function bindReferenceDrop(loadFile) {
  let depth = 0; const over = (on) => $('refwin').classList.toggle('drop-over', on);
  const stop = (e) => { if (!hasFiles(e)) return false; e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; resetGlobalDrop(); return true; };
  $('refwin').addEventListener('dragenter', (e) => { if (stop(e)) { depth++; over(true); } });
  $('refwin').addEventListener('dragover', stop);
  $('refwin').addEventListener('dragleave', (e) => { if (!stop(e)) return; if (e.relatedTarget && $('refwin').contains(e.relatedTarget)) return; depth = Math.max(0, depth - 1); if (!depth) over(false); });
  $('refwin').addEventListener('drop', (e) => { if (!stop(e)) return; depth = 0; over(false); const files = imageFiles(e);
    if (files.length) files.forEach((f) => loadFile(f)); else if (e.dataTransfer && e.dataTransfer.files.length) toast(t('toast.notImage')); });
}
