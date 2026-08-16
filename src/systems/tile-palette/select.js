// Выбор и перестановка тайлов — те же механики, что у свотчей палитры цветов:
// клик = active, Ctrl = тумблер, Shift = диапазон, ЛКМ-перетаскивание =
// перестановка (призрак + место вставки), ПКМ-протяжка = выделение наведением,
// ПКМ/долгий тап без движения = контекст-меню.
// Несколько выбранных = ПАТТЕРН (Godot) для штампа. Логика общая, без дублей:
// призрак — core/drag-ghost, место вставки — core/drop-gap.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { setTool } from '../../core/tools.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { makeDropGap, dropZone } from '../../core/drop-gap.js';
import { LONG_PRESS_MS, DRAG_THRESHOLD } from '../../config/timings.js';
import { activeTileset } from './ops.js';
import { openTileMenu } from './menu.js';

let anchor = null, drag = null, clickSquelch = false, rebuild = () => {};
export const initSelect = (rb) => { rebuild = rb; };
const squelch = () => { clickSquelch = true; setTimeout(() => { clickSquelch = false; }, 0); }; // погасить click после жеста
const ids = (ts) => ts.tiles.map((t) => t.id);
const cellAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('#tile-list .tile-cell') : null; };
const cellEl = (tileId) => document.querySelector('#tile-list .tile-cell[data-tid="' + tileId + '"]');

function rangeIds(ts, a, b) { const arr = ids(ts), i = arr.indexOf(a), j = arr.indexOf(b); if (i < 0 || j < 0) return [b];
  const [lo, hi] = i <= j ? [i, j] : [j, i]; return arr.slice(lo, hi + 1); }
function validMarks(ts) { if (!ts) { S.tileMarks = new Set(); anchor = null; return; }
  const live = new Set(ids(ts)); S.tileMarks = new Set([...S.tileMarks].filter((id) => live.has(id)));
  if (!live.has(anchor)) anchor = S.tileMarks.size ? S.tileMarks.values().next().value : null; }
function activeAnchor(ts, tileId) {
  const live = new Set(ids(ts));
  if (live.has(anchor)) return anchor;
  if (S.activeTile && S.activeTile.tilesetId === ts.id && live.has(S.activeTile.tileId)) return S.activeTile.tileId;
  return tileId;
}
function changed() { rebuild(); buildPattern(); bus.emit('tileset-changed'); }

export function selectTile(ts, tileId, e) {
  validMarks(ts);
  S.activeTile = S.placeTile = { tilesetId: ts.id, tileId };
  S.tileMode = 'paint'; setTool('tilebrush');
  if (e && (e.ctrlKey || e.metaKey)) { if (S.tileMarks.has(tileId)) S.tileMarks.delete(tileId); else S.tileMarks.add(tileId); anchor = tileId; }
  else if (e && e.shiftKey) { const a = activeAnchor(ts, tileId); S.tileMarks = new Set(rangeIds(ts, a, tileId)); anchor = a; }
  else { S.tileMarks = new Set([tileId]); anchor = tileId; }
  changed();
}

// паттерн из выбранных свотчей по их видимому расположению (строки/столбцы DOM)
export function buildPattern() {
  if (S.tileMarks.size < 2) { S.tilePattern = null; return; }
  const cells = [...document.querySelectorAll('#tile-list .tile-cell')].filter((c) => S.tileMarks.has(+c.dataset.tid));
  if (cells.length < 2) { S.tilePattern = null; return; }
  const rects = cells.map((c) => ({ id: +c.dataset.tid, r: c.getBoundingClientRect() }));
  const rows = [...new Set(rects.map((x) => Math.round(x.r.top)))].sort((a, b) => a - b);
  const cols = [...new Set(rects.map((x) => Math.round(x.r.left)))].sort((a, b) => a - b);
  const grid = new Array(rows.length * cols.length).fill(null);
  for (const x of rects) grid[rows.indexOf(Math.round(x.r.top)) * cols.length + cols.indexOf(Math.round(x.r.left))] = x.id;
  S.tilePattern = { w: cols.length, h: rows.length, ids: grid };
}

// перестановка ts.tiles: переносимые id (в текущем порядке) → перед/после target
function reorder(ts, movingIds, targetId, after) { const moveSet = new Set(movingIds);
  if (moveSet.has(targetId)) return false;
  const moving = ts.tiles.filter((t) => moveSet.has(t.id)); if (!moving.length) return false;
  const rest = ts.tiles.filter((t) => !moveSet.has(t.id));
  let ins = rest.findIndex((t) => t.id === targetId); if (ins < 0) return false; if (after) ins++;
  ts.tiles = [...rest.slice(0, ins), ...moving, ...rest.slice(ins)]; return true;
}
function paintSelect(tileId) {
  if (S.tileMarks.has(tileId)) return;
  S.tileMarks.add(tileId); if (anchor == null) anchor = tileId;
  const cell = cellEl(tileId); if (cell) cell.classList.add('marked');
}

// навесить жесты на ячейку тайла (вызывается из list.js при рендере)
export function wireTile(cell, ts, tileId) {
  cell.addEventListener('contextmenu', (e) => e.preventDefault());
  cell.addEventListener('click', (e) => { if (clickSquelch || e.detail > 1) return; selectTile(ts, tileId, e); });
  cell.addEventListener('pointerdown', (e) => {
    const moveSel = S.tileMarks.has(tileId) && S.tileMarks.size > 1;
    const moveIds = moveSel ? [...S.tileMarks] : [tileId];
    const base = { cell, ts, tileId, moveIds, x: e.clientX, y: e.clientY, moved: false, gap: makeDropGap({ className: 'tile-drop-gap', enabled: false }) };
    if (e.pointerType === 'touch') { drag = { ...base, touch: true, hold: setTimeout(() => { if (drag) drag.armed = true; }, LONG_PRESS_MS) }; return; }
    if (e.button === 2) { drag = { ...base, rmb: true }; return; }
    if (e.button === 0) drag = { ...base, armed: true };
  });
}

function dragMove(e) { if (!drag) return;
  if (!drag.moved) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= DRAG_THRESHOLD) return; drag.moved = true; }
  if (drag.touch && !drag.armed) { drag = null; return; } // тач: двинул до удержания — это скролл, не драг
  if (drag.rmb) { const tg = cellAt(e); if (!drag.painted) { drag.painted = true; paintSelect(drag.tileId); } if (tg) paintSelect(+tg.dataset.tid); return; }
  if (!drag.ghostObj) { drag.cell.classList.add('dragging'); drag.ghostObj = dragGhost(drag.cell, null, drag.moveIds.length); }
  drag.ghostObj.move(e.clientX, e.clientY);
  const tg = cellAt(e), box = document.getElementById('tile-list');
  if (tg && tg !== drag.cell) drag.gap.show(box, tg, dropZone(tg, e.clientX, e.clientY, 'x', 0).after, tg); else drag.gap.cancel();
}

function dragEnd(e) { if (!drag) return; clearTimeout(drag.hold);
  const d = drag; drag = null; if (d.ghostObj) d.ghostObj.remove(); d.cell.classList.remove('dragging');
  const after = !!d.gap.after, tgt = d.gap.target; d.gap.remove();
  if (d.rmb && !d.moved) { squelch(); openTileMenu(e.clientX, e.clientY, d.tileId); return; } // ПКМ без протяжки → меню
  if (d.rmb) { squelch(); validMarks(d.ts); changed(); return; } // протяжка ПКМ → выделение наведением
  if (d.touch && d.armed && !d.moved) { squelch(); openTileMenu(e.clientX, e.clientY, d.tileId); return; } // долгий тап → меню
  if (!d.moved) return;
  if (tgt && reorder(d.ts, d.moveIds, +tgt.dataset.tid, after)) { squelch(); changed(); }
}

export function mountSelect() { document.addEventListener('pointermove', dragMove);
  document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd); }
export { activeTileset };
