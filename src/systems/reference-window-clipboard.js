import { makeCanvas } from '../core/canvas.js';
import { toast, t } from '../core/dom.js';

let fallbackUrl = null;

function toBlob(c) {
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => { const r = new window.FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob); });
}
function bounds(items) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  items.forEach((it) => { x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y); x1 = Math.max(x1, it.x + it.w); y1 = Math.max(y1, it.y + it.h); });
  return { x: x0, y: y0, w: Math.max(1, Math.ceil(x1 - x0)), h: Math.max(1, Math.ceil(y1 - y0)) };
}

export function refsCanvas(items, getRec, single = false) {
  if (!items.length) return null;
  const bd = single ? { x: items[0].x, y: items[0].y, w: items[0].w, h: items[0].h } : bounds(items);
  const c = makeCanvas(Math.ceil(bd.w), Math.ceil(bd.h)), x = c.getContext('2d');
  items.forEach((it) => { const rec = getRec(it); if (rec.ready) x.drawImage(rec.img, it.x - bd.x, it.y - bd.y, it.w, it.h); });
  return c;
}

export async function copyRefs(items, getRec) {
  const c = refsCanvas(items, getRec); if (!c) return;
  fallbackUrl = c.toDataURL('image/png');
  try {
    if (navigator.clipboard && window.ClipboardItem) await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': await toBlob(c) })]);
    toast(t('toast.copied', { s: 'PNG' }));
  } catch (e) { toast(t('toast.copied', { s: 'PNG' })); }
}

export async function pasteRef(add) {
  try {
    if (navigator.clipboard && navigator.clipboard.read) for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((it) => it.startsWith('image/')); if (!type) continue;
      add(await blobToDataUrl(await item.getType(type))); toast(t('toast.pasted')); return true;
    }
  } catch (e) {}
  if (fallbackUrl) { add(fallbackUrl); toast(t('toast.pasted')); return true; }
  toast(t('toast.bufferEmpty')); return false;
}

export function saveRef(item, getRec) {
  const c = refsCanvas([item], getRec, true); if (!c) return;
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'reference.png'; a.click();
}
