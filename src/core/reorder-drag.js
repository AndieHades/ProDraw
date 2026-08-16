// Перестановка кнопок перетаскиванием — те же механики, что у цветов палитры:
// призрак следует за курсором, элемент вставляется перед/после соседа под ним
// (можно между контейнерами). Захват: долгий тап (палец) или удержание ПКМ
// (мышь) — чтобы не мешать обычному клику по кнопке.
import { LONG_PRESS_MS, DRAG_THRESHOLD } from '../config/timings.js';

let cur = null, inited = false;
const closePopovers = () => document.dispatchEvent(new window.CustomEvent('ui-close-popovers'));

function onMove(e) { if (!cur) return;
  if (!cur.armed) { if (Math.hypot(e.clientX - cur.sx, e.clientY - cur.sy) > DRAG_THRESHOLD) { clearTimeout(cur.hold); cur = null; } return; } // двинул до удержания — это не драг
  if (!cur.moved) { if (Math.hypot(e.clientX - cur.sx, e.clientY - cur.sy) <= DRAG_THRESHOLD) return;
    closePopovers(); cur.moved = true; cur.el.classList.add('reordering'); cur.ghost = cur.el.cloneNode(true); cur.ghost.classList.add('reorder-ghost'); document.body.appendChild(cur.ghost); }
  cur.ghost.style.left = e.clientX + 'px'; cur.ghost.style.top = e.clientY + 'px';
  const t = document.elementFromPoint(e.clientX, e.clientY), item = t && t.closest ? t.closest(cur.itemSel) : null, cont = t && t.closest ? t.closest(cur.dropSel) : null;
  const canDrop = (c) => !cur.accept || cur.accept(cur.el, c);
  if (item && item !== cur.el && item.parentNode && canDrop(item.parentNode)) { const r = item.getBoundingClientRect();
    item.parentNode.insertBefore(cur.el, (e.clientX < r.left + r.width / 2) ? item : item.nextSibling); }
  else if (cont && !cont.contains(cur.el) && canDrop(cont)) cont.appendChild(cur.el);
}
function onUp() { if (!cur) return; clearTimeout(cur.hold);
  const c = cur; cur = null; if (c.ghost) c.ghost.remove(); c.el.classList.remove('reordering');
  if (c.moved) { c.squelch(); c.save(); } }

export function attachReorder(el, opts) { // opts: { dropSel, itemSel, save, squelch }
  if (!inited) { inited = true; document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp); }
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') { cur = { el, sx: e.clientX, sy: e.clientY, armed: false, moved: false, ...opts, hold: setTimeout(() => { if (cur) { cur.armed = true; closePopovers(); } }, LONG_PRESS_MS) }; }
    else if (e.button === 2) { e.preventDefault(); closePopovers(); cur = { el, sx: e.clientX, sy: e.clientY, armed: true, moved: false, ...opts }; }
  });
}
