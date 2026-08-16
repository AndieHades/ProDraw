// Reference board is document data: images, their positions, active view and
// open state. DOM/image caches live in systems/reference-window.js.
const num = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback);

export const defaultReferenceBoard = () => ({
  open: false,
  nextId: 1,
  selected: [],
  view: { z: 1, x: 0, y: 0 },
  items: [],
});

export function normalizeReferenceBoard(src) {
  const out = defaultReferenceBoard();
  if (!src || typeof src !== 'object') return out;
  out.open = !!src.open;
  out.view = {
    z: Math.max(0.05, num(src.view && src.view.z, 1)),
    x: num(src.view && src.view.x),
    y: num(src.view && src.view.y),
  };
  out.items = (Array.isArray(src.items) ? src.items : []).filter((it) => it && it.src).map((it, i) => ({
    id: num(it.id, i + 1),
    src: String(it.src),
    x: num(it.x),
    y: num(it.y),
    w: Math.max(1, num(it.w, 1)),
    h: Math.max(1, num(it.h, 1)),
  }));
  const ids = new Set(out.items.map((it) => it.id));
  const picked = Array.isArray(src.selected) ? src.selected : (src.selected == null ? [] : [src.selected]);
  out.selected = picked.map((id) => num(id, NaN)).filter((id) => ids.has(id));
  out.nextId = Math.max(num(src.nextId, 1), 1, ...out.items.map((it) => it.id + 1));
  return out;
}

export function cloneReferenceBoard(src) {
  const b = normalizeReferenceBoard(src);
  return {
    open: b.open,
    nextId: b.nextId,
    selected: [],
    view: { ...b.view },
    items: b.items.map((it) => ({ ...it })),
  };
}
