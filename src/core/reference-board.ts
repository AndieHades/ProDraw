// Reference board is document data: images, their positions, active view and
// open state. DOM/image caches live in systems/reference-window.js.
export interface ReferenceBoardItem {
  id: number; src: string; x: number; y: number; w: number; h: number;
}
export interface ReferenceBoardView { z: number; x: number; y: number }
export interface ReferenceBoard {
  open: boolean;
  nextId: number;
  selected: number[];
  view: ReferenceBoardView;
  items: ReferenceBoardItem[];
}

const num = (v: unknown, fallback = 0): number =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;

export const defaultReferenceBoard = (): ReferenceBoard => ({
  open: false, nextId: 1, selected: [], view: { z: 1, x: 0, y: 0 }, items: [],
});

export function normalizeReferenceBoard(src: unknown): ReferenceBoard {
  const out = defaultReferenceBoard();
  if (!src || typeof src !== "object") return out;
  const raw = src as Record<string, unknown>;
  const view = raw["view"] as Record<string, unknown> | undefined;
  out.open = !!raw["open"];
  out.view = { z: Math.max(0.05, num(view?.["z"], 1)),
    x: num(view?.["x"]), y: num(view?.["y"]) };
  const items = Array.isArray(raw["items"]) ? raw["items"] : [];
  out.items = items
    .filter((it): it is Record<string, unknown> => !!it && !!(it as { src?: unknown }).src)
    .map((it, i) => ({ id: num(it["id"], i + 1), src: String(it["src"]),
      x: num(it["x"]), y: num(it["y"]),
      w: Math.max(1, num(it["w"], 1)), h: Math.max(1, num(it["h"], 1)) }));
  const ids = new Set(out.items.map((it) => it.id));
  const chosen = raw["selected"];
  const picked = Array.isArray(chosen) ? chosen : chosen == null ? [] : [chosen];
  out.selected = picked.map((id) => num(id, NaN)).filter((id) => ids.has(id));
  out.nextId = Math.max(num(raw["nextId"], 1), 1, ...out.items.map((it) => it.id + 1));
  return out;
}

export function cloneReferenceBoard(src: unknown): ReferenceBoard {
  const b = normalizeReferenceBoard(src);
  return { open: b.open, nextId: b.nextId, selected: [], view: { ...b.view },
    items: b.items.map((it) => ({ ...it })) };
}
