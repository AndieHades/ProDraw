import { S } from '../../core/state.js';
import { compositeLayers } from '../../core/layer-cache.js';
import { makeCanvas } from '../../core/canvas.js';
import { GALLERY_PREVIEW_MAX_SIDE } from '../../config/limits.ts';

function encodeCanvas(canvas) {
  if (typeof canvas.toBlob !== 'function') return Promise.resolve(canvas.toDataURL('image/png'));
  return new Promise((resolve) => canvas.toBlob((blob) => {
    if (!blob) { resolve(canvas.toDataURL('image/png')); return; }
    const Reader = canvas.ownerDocument?.defaultView?.FileReader || globalThis.FileReader;
    if (!Reader) { resolve(canvas.toDataURL('image/png')); return; }
    const reader = new Reader(); reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve(canvas.toDataURL('image/png'));
    reader.readAsDataURL(blob);
  }, 'image/png'));
}

export async function renderGalleryPreview(isCurrent) {
  if (!isCurrent()) return null;
  const scale = Math.min(1, GALLERY_PREVIEW_MAX_SIDE / Math.max(S.W, S.H));
  const width = Math.max(1, Math.round(S.W * scale));
  const height = Math.max(1, Math.round(S.H * scale));
  const canvas = makeCanvas(width, height), context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  compositeLayers(context);
  if (!isCurrent()) return null;
  const preview = await encodeCanvas(canvas);
  return isCurrent() ? preview : null;
}
