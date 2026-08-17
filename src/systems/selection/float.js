// Плавающий фрагмент выделения: поднять из слоя, нести (в т.ч. зеркально),
// положить обратно. Мутирует G и S.selFloat; жесты — в ./input.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { parseKey } from '../../logic/raster.js';
import { symA, symHA } from '../../core/layers.js';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { maskHas } from '../../core/selection.js';
import { SelectionMask, selectionStateFromMask } from '../../logic/mask-ops.js';
import { snapshot, snapshotRasterReferences } from '../../core/history.js';
import { gridBoundsMetadata, setGridBounds } from '../../logic/raster.js';

let pendingCow = null;

const mergeBounds = (left, right) => !left ? right : !right ? left : ({
  minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
  maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy),
});

export function beginLiftHistory() {
  const layer = S.layers[S.cur];
  if (!layer || !snapshotRasterReferences([S.cur])) {
    snapshot(); pendingCow = null; return;
  }
  const sourceGrid = layer.grid;
  const targetGrid = sourceGrid.slice();
  const metadata = gridBoundsMetadata(sourceGrid);
  if (metadata) setGridBounds(targetGrid, metadata.bounds, metadata.exact);
  layer.grid = targetGrid; layer.ext = new Map(layer.ext);
  pendingCow = { sourceGrid, clonedRows: new Set() };
}

function writableRow(layer, y, cow = pendingCow) {
  if (!cow || cow.clonedRows.has(y)) return layer.grid[y];
  layer.grid[y] = cow.sourceGrid[y].slice(); cow.clonedRows.add(y);
  return layer.grid[y];
}

export function liftSelection() { const L = S.layers[S.cur]; if (!L) return; const g = L.grid, w = S.sel.x1 - S.sel.x0 + 1, h = S.sel.y1 - S.sel.y0 + 1;
  const cells = new Map(), bounds = layerContentBounds(S.cur);
  if (bounds) { const x0 = Math.max(S.sel.x0, bounds.minx), x1 = Math.min(S.sel.x1, bounds.maxx);
    const y0 = Math.max(S.sel.y0, bounds.miny), y1 = Math.min(S.sel.y1, bounds.maxy);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!maskHas(S.selMask, x, y)) continue; const c = g[y][x];
      if (c) { cells.set((x - S.sel.x0) + ',' + (y - S.sel.y0), c); writableRow(L, y)[x] = null; } } }
  if (!S.selMask) for (const [k, c] of [...L.ext]) { const [ax, ay] = parseKey(k);
    const grab = (S.sel.x1 === S.W - 1 && ax >= S.W && ay >= S.sel.y0 && ay <= S.sel.y1)
      || (S.sel.x0 === 0 && ax < 0 && ay >= S.sel.y0 && ay <= S.sel.y1)
      || (S.sel.y1 === S.H - 1 && ay >= S.H && ax >= S.sel.x0 && ax <= S.sel.x1)
      || (S.sel.y0 === 0 && ay < 0 && ax >= S.sel.x0 && ax <= S.sel.x1);
    if (grab) { cells.set((ax - S.sel.x0) + ',' + (ay - S.sel.y0), c); L.ext.delete(k); } }
  S.selMask = null; S.selFloat = { cells, w, h, x: S.sel.x0, y: S.sel.y0,
    ox: S.sel.x0, oy: S.sel.y0, li: S.cur, cow: pendingCow };
  pendingCow = null; markDirty(S.cur, S.sel); }

export function liftSelectionSym(grabX, grabY) { const L = S.layers[S.cur]; if (!L) return; const g = L.grid, gL = grabX * 2 <= S.W - 1, gT = grabY * 2 <= S.H - 1, items = [];
  const bounds = layerContentBounds(S.cur), x0 = Math.max(S.sel.x0, bounds?.minx ?? 0), x1 = Math.min(S.sel.x1, bounds?.maxx ?? -1);
  const y0 = Math.max(S.sel.y0, bounds?.miny ?? 0), y1 = Math.min(S.sel.y1, bounds?.maxy ?? -1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = g[y] && g[y][x];
    if (!c || !maskHas(S.selMask, x, y)) continue; writableRow(L, y)[x] = null;
    const sgnx = symA() ? (x === S.W - 1 - x ? 0 : ((x * 2 <= S.W - 1) === gL ? 1 : -1)) : 1;
    const sgny = symHA() ? (y === S.H - 1 - y ? 0 : ((y * 2 <= S.H - 1) === gT ? 1 : -1)) : 1;
    items.push({ ax: x, ay: y, c, sgnx, sgny }); }
  S.selMask = null; S.selFloat = { symItems: items, dx: 0, dy: 0,
    li: S.cur, cow: pendingCow };
  pendingCow = null; markDirty(S.cur, S.sel); }

export function symFloatBounds() { let x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (const it of S.selFloat.symItems) { const xx = it.ax + it.sgnx * S.selFloat.dx, yy = it.ay + it.sgny * S.selFloat.dy;
    if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  S.sel = x1 < 0 ? null : { x0, y0, x1, y1 }; }

// фрагмент оседает в слой-источник (li), даже если активный слой успел смениться
export function commitFloat() { if (!S.selFloat) return; const li = S.selFloat.li ?? S.cur, L = S.layers[li];
  const sourceBounds = S.sel ? { ...S.sel } : null;
  const landed = new SelectionMask(S.W, S.H);
  if (S.selFloat.symItems) { for (const it of S.selFloat.symItems) { const xx = it.ax + it.sgnx * S.selFloat.dx, yy = it.ay + it.sgny * S.selFloat.dy;
    if (xx >= 0 && yy >= 0 && xx < S.W && yy < S.H) { writableRow(L, yy, S.selFloat.cow)[xx] = it.c; landed.forceSelected(xx, yy); } else L.ext.set(xx + ',' + yy, it.c); } }
  else for (const [k, c] of S.selFloat.cells) { const [dx, dy] = parseKey(k); const xx = S.selFloat.x + dx, yy = S.selFloat.y + dy;
    if (xx >= 0 && yy >= 0 && xx < S.W && yy < S.H) { writableRow(L, yy, S.selFloat.cow)[xx] = c; landed.forceSelected(xx, yy); } else L.ext.set(xx + ',' + yy, c); }
  const state = selectionStateFromMask(landed);
  S.sel = state?.sel ?? null; S.selMask = state?.mask ?? null;
  S.selFloat = null; const damage = mergeBounds(sourceBounds, state?.sel ?? null);
  if (damage) markDirty(li, damage); bus.emit('layers'); }

// поднятый фрагмент живёт между жестами — оседает при смене инструмента и перед undo/redo
bus.on('tool', () => commitFloat());
bus.on('before-undo', () => commitFloat());
