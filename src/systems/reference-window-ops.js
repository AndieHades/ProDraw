import { makeCanvas } from '../core/canvas.js';

export const selectedSet = (b) => new Set(Array.isArray(b.selected) ? b.selected : (b.selected == null ? [] : [b.selected]));
export const setSelected = (b, ids) => { b.selected = [...new Set(ids)]; };
export const selectedItems = (b) => { const ids = selectedSet(b); return b.items.filter((it) => ids.has(it.id)); };
export function referencePoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - (rect.left || 0), y: event.clientY - (rect.top || 0) };
}
export function referenceHit(board, canvas, event) {
  const point = referencePoint(canvas, event), view = board.view;
  const x = (point.x - view.x) / view.z, y = (point.y - view.y) / view.z;
  for (let index = board.items.length - 1; index >= 0; index--) {
    const item = board.items[index];
    if (x >= item.x && y >= item.y && x <= item.x + item.w && y <= item.y + item.h) return item;
  }
  return null;
}

export function boardBounds(items) {
  if (!items.length) return null;
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
  for (const item of items) {
    x = Math.min(x, item.x); y = Math.min(y, item.y);
    right = Math.max(right, item.x + item.w); bottom = Math.max(bottom, item.y + item.h);
  }
  return { x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y) };
}

export function nextBoardPosition(board, size, itemWidth) {
  if (!board.items.length) return { x: 0, y: 0 };
  const bounds = boardBounds(board.items), gap = 12 / Math.max(0.05, board.view.z || 1);
  const x = bounds.x + bounds.w + gap, y = bounds.y;
  return board.view.x + (x + itemWidth) * board.view.z <= size.w - 8 ?
    { x, y } : { x: bounds.x, y: bounds.y + bounds.h + gap };
}

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
