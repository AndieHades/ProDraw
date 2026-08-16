// Перетаскивание плиток: исходник остаётся на месте затемнённым, по курсору едет
// лёгкий призрак — только увеличенная картинка превью без подписей. Сетка во время
// драга не перекомпоновывается (никакого gap) — точку вставки считаем по курсору и
// применяем одним ре-рендером на отпускании, чтобы большие галереи не дёргались.
import { DRAG_THRESHOLD, FOLDER_HOLD_MS } from '../../config/timings.js';
import { $ } from '../../core/dom.js';
import { dropZone } from '../../core/drop-gap.js';

let clickGuard = false, clickGuardUntil = 0;

function ensureClickGuard() {
  if (clickGuard) return; clickGuard = true;
  document.addEventListener('click', (e) => {
    if (Date.now() > clickGuardUntil) return;
    e.preventDefault(); e.stopPropagation();
  }, true);
}

function pointIn(el, x, y) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function slotFromPoint(grid, dragged, x, y) {
  const items = [...grid.querySelectorAll('.gal-tile')]
    .filter((n) => !dragged.has(n) && !n.classList.contains('dragging'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }));
  if (!items.length) return null;
  // ряд под курсором; если курсор выше/ниже всех рядов — берём ближайший по Y,
  // чтобы край у первой/последней плитки тоже давал точку вставки
  const mid = (r) => (r.top + r.bottom) / 2;
  let row = items.filter((it) => y >= it.r.top && y <= it.r.bottom);
  if (!row.length) { const near = items.reduce((b, it) => Math.abs(mid(it.r) - y) < Math.abs(mid(b.r) - y) ? it : b);
    row = items.filter((it) => Math.abs(it.r.top - near.r.top) < 2); }
  row = row.sort((a, b) => a.r.left - b.r.left);
  // за левым краем первой → перед ней; за правым краем последней → после неё (без отскока)
  for (const it of row) if (x < it.r.left + it.r.width / 2) return { node: it.el, after: false };
  return { node: row[row.length - 1].el, after: true };
}

function nextTile(node, ignored) {
  let n = node ? node.nextElementSibling : null;
  while (n && (!n.matches('.gal-tile') || ignored.has(n))) n = n.nextElementSibling;
  return n;
}

// призрак = только превью плитки (без подписей), фикс-размер = размер плитки +12px
// (квадрат, постоянный — не зависит от позиции). Призрак висит на body, поэтому
// токены размера переносим явно (на #gal-grid они есть, на body — нет).
function galleryGhost(tile, grid) {
  const cs = window.getComputedStyle(grid);
  const thumb = tile.querySelector('.gal-thumb');
  const base = parseFloat(cs.getPropertyValue('--gal-tile')) || (thumb ? thumb.getBoundingClientRect().width : 96);
  const g = document.createElement('div'); g.className = 'gal-drag-ghost';
  g.style.setProperty('--gal-tile', Math.round(base * 1.1) + 'px'); // размер выросшей картинки (+10%)
  g.style.setProperty('--gal-preview-inset', cs.getPropertyValue('--gal-preview-inset') || '0px');
  if (thumb) { const c = thumb.cloneNode(true); c.querySelector('.gal-check')?.remove(); g.appendChild(c); }
  document.body.appendChild(g);
  return { move: (x, y) => { g.style.left = x + 'px'; g.style.top = y + 'px'; }, remove: () => g.remove() };
}

export function attachDrag(tile, id, ctx) {
  ensureClickGuard();
  tile.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button) return;
    if (e.target.closest && e.target.closest('.gal-cap')) return; // имя/подпись — не драг, чтобы двойной клик переименовывал
    const isTouch = e.pointerType === 'touch';
    if (isTouch) try { tile.setPointerCapture(e.pointerId); } catch (err) {}
    if (isTouch) { tile.classList.add('pressing'); setTimeout(() => tile.classList.remove('pressing'), 1500); } // тач-тап: вся плитка медленно сжимается и возвращается (у мыши это hover)
    const sx = e.clientX, sy = e.clientY;
    let lifted = false, started = false, ghost = null, dwell = null, overKey = '', stackTo = null, onBack = false, liftBeginT = null;
    let dropReady = false, dropBefore = null;
    let dragIds = [id], dragEls = [tile], dragged = new Set(dragEls);
    const grid = ctx.gridEl(), back = $('gal-back');
    // растим картинку и, как только рост закончился (~450мс), сразу делаем готовый
    // призрак — таскать можно немедленно, не дожидаясь движения пальца
    const lift = () => { if (lifted || started) return; lifted = true; tile.classList.add('lifting');
      liftBeginT = setTimeout(() => { if (lifted && !started) begin(sx, sy); }, 450); };
    const hold = setTimeout(lift, isTouch ? 1450 : 1e9); // тач: рост картинки после того, как отыграл «клевок» (800мс ужатие + 650мс возврат)
    if (!isTouch) lift(); // мышь: клик сразу растит картинку (hover уже сыграл клевок)
    function begin(x, y) { if (started) return; started = true; try { tile.setPointerCapture(e.pointerId); } catch (err) {}
      dragIds = ctx.dragIds ? ctx.dragIds(id) : [id];
      dragEls = dragIds.map((did) => grid.querySelector(`.gal-tile[data-id="${did}"]`)).filter(Boolean);
      dragged = new Set(dragEls);
      ghost = galleryGhost(tile, grid); ghost.move(x, y);
      // исходник возвращается к обычному размеру и затемняется; увеличение уходит в призрак
      dragEls.forEach((el) => { el.classList.remove('lifting'); el.classList.add('dragging'); });
      if (back.style.display !== 'none') back.classList.add('lift'); } // «назад» увеличивается на всё время перетаскивания
    const clearMarks = () => { grid.querySelectorAll('.drop-into').forEach((n) => n.classList.remove('drop-into')); back.classList.remove('over'); };
    const resetHover = (key) => { if (key === overKey) return; overKey = key; clearTimeout(dwell); stackTo = null; dropReady = false; dropBefore = null; clearMarks(); };
    const setDrop = (node, after) => { dropReady = true; dropBefore = after ? nextTile(node, dragged) : node; };
    const canStack = (tg) => !!tg; // складывать можно на любую плитку: папку на файл, файл на папку и т.д.
    const move = (ev) => {
      if (isTouch && (lifted || started) && ev.cancelable) ev.preventDefault();
      if (!started) {
        const moved = Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_THRESHOLD;
        if (moved && (!isTouch || lifted)) { clearTimeout(hold); begin(ev.clientX, ev.clientY); } else return;
      }
      ghost.move(ev.clientX, ev.clientY);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const overBack = back.style.display !== 'none' && el && el.closest && el.closest('#gal-back'); // бросок на «назад» — на уровень выше
      if (overBack) { if (!onBack) { resetHover(''); onBack = true; back.classList.add('over'); } return; }
      onBack = false;
      const raw = el && el.closest ? el.closest('.gal-tile') : null;
      const tg = raw && !dragged.has(raw) ? raw : null;
      const zone = tg ? dropZone(tg, ev.clientX, ev.clientY, 'x') : null, into = tg && zone.zone === 'center' && canStack(tg);
      const key = tg ? tg.dataset.id + ':' + (into ? 'center' : (zone.after ? 'after' : 'before')) : '';
      if (key !== overKey) { resetHover(key); if (into) dwell = setTimeout(() => { tg.classList.add('drop-into'); stackTo = tg; }, FOLDER_HOLD_MS); }
      if (stackTo) return;
      if (tg) setDrop(tg, zone.after); // и для center (папка): пока не сработала выдержка — обычная перестановка рядом
      else if (pointIn(grid, ev.clientX, ev.clientY)) {
        const pos = slotFromPoint(grid, dragged, ev.clientX, ev.clientY);
        if (!pos) { resetHover(''); return; }
        resetHover('empty:' + pos.node.dataset.id + ':' + (pos.after ? 'after' : 'before')); setDrop(pos.node, pos.after);
      } else resetHover('');
    };
    const up = () => { clearTimeout(hold); clearTimeout(dwell); clearTimeout(liftBeginT);
      tile.removeEventListener('pointermove', move); tile.removeEventListener('pointerup', up); tile.removeEventListener('pointercancel', up); tile.removeEventListener('lostpointercapture', up);
      if (tile.hasPointerCapture && tile.hasPointerCapture(e.pointerId)) try { tile.releasePointerCapture(e.pointerId); } catch (err) {}
      if (ghost) ghost.remove(); dragEls.forEach((el) => el.classList.remove('dragging', 'lifting')); tile.classList.remove('lifting'); back.classList.remove('lift', 'over');
      const target = stackTo, toBack = onBack, before = dropReady ? dropBefore : null; clearMarks();
      if (!started) { if (lifted && isTouch) clickGuardUntil = Date.now() + 350; return; } // на тач долгий тап не открывает; мышь — клик всегда открывает
      clickGuardUntil = Date.now() + 450;
      if (toBack) ctx.onBack(dragIds);
      else if (target) ctx.onStack(dragIds, target.dataset.id, target.dataset.kind);
      else if (dropReady) ctx.onReorder(dragIds, before ? before.dataset.id : null);
    };
    tile.addEventListener('pointermove', move); tile.addEventListener('pointerup', up); tile.addEventListener('pointercancel', up); tile.addEventListener('lostpointercapture', up);
  });
}
