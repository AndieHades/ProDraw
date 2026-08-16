// Память библиотеки кистей: наборы (папки) и кисти с порядком/принадлежностью
// (как слои). Грузится из IndexedDB, мутации сразу персистятся. Активная кисть
// живёт в S.stampBrush — тут только каталог.
import { listBrushes, listSets, saveBrush, saveSet, removeBrush } from '../../core/brush-store.js';
import { t } from '../../i18n/index.js';

export const lib = { sets: [], brushes: [], curSet: null };
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const byOrder = (a, b) => a.order - b.order;

let loaded = false;
export async function ensureLib() { if (loaded) return; loaded = true; await loadLib(); }

export async function loadLib() {
  lib.sets = (await listSets()).sort(byOrder);
  lib.brushes = (await listBrushes()).sort(byOrder);
  if (!lib.sets.length) { const s = { id: uid('s'), name: '', order: 0, imported: true }; await saveSet(s); lib.sets = [s]; }
  if (!lib.curSet || !lib.sets.some((s) => s.id === lib.curSet)) lib.curSet = lib.sets[0].id;
  if (!lib.brushes.length) await seedBase(lib.sets[0].id); // базовые кисти, если библиотека пуста
}

// встроенные базовые кисти (генерируются, без внешних файлов): круг, квадрат, дизеринг
async function seedBase(setId) {
  const square = { w: 1, h: 1, data: new Uint8Array([255]) }; // 1×1 → сплошной квадрат при ресемпле
  const checker = { w: 2, h: 2, data: new Uint8Array([0, 1, 1, 0]) }; // дизер-тайл (шахматка)
  const base = [
    { name: t('brush.round'), source: 'base', shape: 'round', cov: null, grain: null, params: {} },
    { name: t('brush.square'), source: 'base', shape: 'shape', cov: square, grain: null, params: {} },
    { name: t('brush.dither'), source: 'base', shape: 'round', cov: null, grain: checker, params: {} },
  ];
  for (const b of base) await addBrush(b, setId);
}

// плоский список всех кистей по порядку (папки убраны — единая плитка)
export const allBrushes = () => lib.brushes.slice().sort(byOrder);
const nextOrder = () => lib.brushes.reduce((m, b) => Math.max(m, b.order), -1) + 1;

export async function addBrush(rec, setId) {
  const b = { ...rec, id: uid('b'), setId: setId || lib.curSet, order: nextOrder() };
  lib.brushes.push(b); await saveBrush(b); return b;
}
export async function dupBrush(b) { const c = { ...b, id: uid('b'), order: nextOrder() }; lib.brushes.push(c); await saveBrush(c); return c; }
export async function delBrush(id) { lib.brushes = lib.brushes.filter((b) => b.id !== id); await removeBrush(id); }
export async function addSet(name) { // .phbrush-импорт кладёт кисти в свой набор (в общем плоском списке)
  const s = { id: uid('s'), name: name || '', order: lib.sets.length }; lib.sets.push(s); lib.curSet = s.id; await saveSet(s); return s;
}
export async function renameBrush(b, name) { b.name = name || b.name; await saveBrush(b); }

// сохранить порядок кистей по списку id (после перетаскивания плиток)
export function setOrder(ids) { ids.forEach((id, i) => { const b = lib.brushes.find((x) => x.id === id); if (b && b.order !== i) { b.order = i; saveBrush(b); } }); }
