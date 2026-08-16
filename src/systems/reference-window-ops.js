import { makeCanvas } from '../core/canvas.js';

export const selectedSet = (b) => new Set(Array.isArray(b.selected) ? b.selected : (b.selected == null ? [] : [b.selected]));
export const setSelected = (b, ids) => { b.selected = [...new Set(ids)]; };
export const selectedItems = (b) => { const ids = selectedSet(b); return b.items.filter((it) => ids.has(it.id)); };

export function bringFrontIds(b, ids) {
  const set = new Set(ids), rest = [], top = [];
  for (const it of b.items) (set.has(it.id) ? top : rest).push(it);
  b.items.splice(0, b.items.length, ...rest, ...top);
}

export function boxRect(b, d) {
  const x0 = Math.min(d.x, d.px), y0 = Math.min(d.y, d.py), x1 = Math.max(d.x, d.px), y1 = Math.max(d.y, d.py);
  return { x0: (x0 - b.view.x) / b.view.z, y0: (y0 - b.view.y) / b.view.z, x1: (x1 - b.view.x) / b.view.z, y1: (y1 - b.view.y) / b.view.z, sx: x0, sy: y0, sw: x1 - x0, sh: y1 - y0 };
}

export function updateBoxSelection(b, d) {
  const r = boxRect(b, d), ids = new Set(d.mode === 'add' ? d.base : []);
  b.items.forEach((it) => { if (it.x <= r.x1 && it.x + it.w >= r.x0 && it.y <= r.y1 && it.y + it.h >= r.y0) ids.add(it.id); });
  setSelected(b, ids);
}

export function transformItem(it, rec, kind, cacheLoaded, keepCenter = true) {
  if (!rec.ready) return false;
  const rot = kind === 'rotate', cx = it.x + it.w / 2, cy = it.y + it.h / 2;
  const c = makeCanvas(rot ? it.h : it.w, rot ? it.w : it.h), x = c.getContext('2d');
  if (rot) { x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(rec.img, 0, 0, it.w, it.h); }
  else { x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(rec.img, 0, 0, it.w, it.h); }
  it.src = c.toDataURL('image/png'); it.w = c.width; it.h = c.height;
  if (keepCenter) { it.x = cx - it.w / 2; it.y = cy - it.h / 2; }
  cacheLoaded(it, c); return true;
}

export function transformBoardItems(items, bd, getRec, cacheLoaded, kind) {
  for (const it of items) {
    const old = { x: it.x, y: it.y, w: it.w, h: it.h };
    if (kind === 'flip') it.x = bd.x + bd.w - (old.x - bd.x) - old.w;
    else { it.x = bd.x + bd.h - (old.y - bd.y) - old.h; it.y = bd.y + old.x - bd.x; }
    transformItem(it, getRec(it), kind, cacheLoaded, false);
  }
}
