// Запросы к слоям: видимость с учётом папок, обтравка, замок симметрии.
// Чистые функции над состоянием S (без DOM).
import { S } from './state.js';
import { centerSymmetryAxes, symmetryAxes } from '../logic/symmetry.js';

export const folderById = (id) => S.folders.find((x) => x.id === id);
export const layerFolder = (L) => (L && L.fid != null ? folderById(L.fid) : null);

// цепочка папок-предков (от ближайшей к корню) — основа вложенных групп
export function folderChain(fid) { const a = []; let id = fid; while (id != null) { const f = folderById(id); if (!f) break; a.push(f); id = f.parent ?? null; } return a; }

export const effVis = (i) => { const L = S.layers[i]; if (!L.visible) return false;
  for (const f of folderChain(L.fid)) if (!f.visible) return false; return true; };
// произведение прозрачностей цепочки папок (для прозрачности папки целиком)
export const folderOpacity = (fid) => folderChain(fid).reduce((a, f) => a * (f.opacity ?? 1), 1);

export const layerSymLocked = (L) => !!(L && (L.symLock || folderChain(L.fid).some((f) => f.symLock)));

// ближайший видимый reference-слой над target; он задаёт границы заливки
export function referenceIndexFor(target) {
  for (let i = target + 1; i < S.layers.length; i++) if (S.layers[i].reference && effVis(i)) return i;
  return -1;
}

// база обтравки: ближайший необтравочный слой ниже (или -1)
export function clipBase(i) { if (!S.layers[i].clip) return -1;
  let j = i - 1; while (j >= 0 && S.layers[j].clip) j--; return j; }

// активна ли симметрия на текущем слое (с учётом замка слоя/папки)
export const symEnabled = () => S.symEnabled !== false;
export const symA = () => symEnabled() && S.sym && !layerSymLocked(S.layers[S.cur]);   // лево-право
export const symHA = () => symEnabled() && S.symH && !layerSymLocked(S.layers[S.cur]); // верх-низ
export const symDA = () => symEnabled() && S.symD1 && !layerSymLocked(S.layers[S.cur]); // диагональ 45°
export const symDB = () => symEnabled() && S.symD2 && !layerSymLocked(S.layers[S.cur]); // диагональ -45°
export const anySym = () => symA() || symHA() || symDA() || symDB();

export function symmetryConfig() {
  const c = centerSymmetryAxes(S.W, S.H), l = S.symLines || {};
  return symmetryAxes(S.W, S.H, {
    x: symA(),
    y: symHA(),
    d1: symDA(),
    d2: symDB(),
    axisX: Number.isFinite(l.x) ? l.x : c.axisX,
    axisY: Number.isFinite(l.y) ? l.y : c.axisY,
    diagP: Number.isFinite(l.d1) ? l.d1 : c.diagP,
    diagN: Number.isFinite(l.d2) ? l.d2 : c.diagN,
  });
}

export function ensureSymmetryDefaults() {
  const c = centerSymmetryAxes(S.W, S.H);
  S.symLines ||= { x: null, y: null, d1: null, d2: null, mode: null, hover: null };
  if (!Number.isFinite(S.symLines.x)) S.symLines.x = c.axisX;
  if (!Number.isFinite(S.symLines.y)) S.symLines.y = c.axisY;
  if (!Number.isFinite(S.symLines.d1)) S.symLines.d1 = c.diagP;
  if (!Number.isFinite(S.symLines.d2)) S.symLines.d2 = c.diagN;
}

export function resetSymmetryLine(id) {
  const c = centerSymmetryAxes(S.W, S.H);
  ensureSymmetryDefaults();
  if (id === 'x') S.symLines.x = c.axisX;
  else if (id === 'y') S.symLines.y = c.axisY;
  else if (id === 'd1') S.symLines.d1 = c.diagP;
  else if (id === 'd2') S.symLines.d2 = c.diagN;
}
