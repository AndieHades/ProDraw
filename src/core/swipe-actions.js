// Свайп по строке. Влево → выезжает панель кнопок (opts.actions, у правого
// края, «липкая»). Вправо → разовый жест opts.onSwipeRight (резинка + откат).
// Реагирует только на горизонталь (вертикаль оставляем перетаскиванию строк).
// Переиспользуемо: «Новый холст», слои. Открыта только одна строка.
import { DRAG_THRESHOLD } from '../config/timings.js';

let openFront = null;
export function closeSwipe() { if (openFront) { openFront.style.transform = ''; openFront._open = false; openFront = null; } }

export function attachSwipe(row, opts) {
  const actions = opts.actions || [], onRight = opts.onSwipeRight || null, guard = opts.guard || null;
  row.classList.add('swipe-row');
  const front = document.createElement('div'); front.className = 'swipe-front';
  while (row.firstChild) front.appendChild(row.firstChild);
  const reset = () => { front._open = false; front.style.transform = ''; row.classList.remove('swiping-right'); if (openFront === front) openFront = null; };
  let acts = null;
  if (actions.length) { acts = document.createElement('div'); acts.className = 'swipe-acts';
    for (const b of actions) { const el = document.createElement('button'); el.className = 'swipe-act' + (b.danger ? ' danger' : '') + (b.on ? ' on' : '') + (b.icon ? ' icon' : '');
      if (b.icon) { el.innerHTML = b.icon; el.title = b.label; } else el.textContent = b.label;
      el.addEventListener('click', (e) => { e.stopPropagation(); reset(); b.onClick(); }); acts.appendChild(el); }
    row.append(acts); }
  row.append(front);

  let rw = 0, sx = 0, sy = 0, base = 0, cur = 0, dir = 0, suppress = false;
  const setX = (x) => { cur = x; front.style.transform = x ? `translateX(${x}px)` : ''; row.classList.toggle('swiping-right', x > 0); };
  front.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; // свайп — только палец; на десктопе действия в ПКМ-меню
    rw = acts ? acts.offsetWidth : 0; sx = e.clientX; sy = e.clientY; dir = 0; base = front._open ? -rw : 0;
    const move = (ev) => { if (guard && guard()) { if (cur) setX(0); dir = 0; return; } const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dir) { if (Math.abs(dx) <= DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return; dir = 1; if (openFront && openFront !== front) closeSwipe(); }
      let nx = base + dx;
      if (nx <= 0) nx = acts ? Math.max(-rw - 24, nx) : 0; else nx = onRight ? Math.min(80, nx * 0.5) : 0; // вправо — мягкая резинка
      setX(nx); ev.preventDefault(); };
    const up = () => { front.removeEventListener('pointermove', move); front.removeEventListener('pointerup', up); front.removeEventListener('pointercancel', up);
      if (!dir) { if (front._open) reset(); return; }
      suppress = true; setTimeout(() => { suppress = false; }, 0);
      if (acts && cur < -rw / 2) { front._open = true; setX(-rw); openFront = front; }
      else if (onRight && cur > 30) { reset(); onRight(); }
      else reset(); };
    front.addEventListener('pointermove', move); front.addEventListener('pointerup', up); front.addEventListener('pointercancel', up); });

  front.addEventListener('click', (e) => { if (front._open || suppress) { e.stopPropagation(); if (!suppress) reset(); } }, true);
}
