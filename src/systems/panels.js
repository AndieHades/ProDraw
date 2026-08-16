// Кастомизация панелей: кнопки тулбара и сайдбара можно перетаскивать (как
// цвета в палитре) — долгим тапом или удержанием ПКМ — внутри панели и между
// панелями. Порядок сохраняется в localStorage. Слои сюда не входят.
import { $ } from '../core/dom.js';
import { attachReorder } from '../core/reorder-drag.js';

const STORE = 'panelOrder';
const PANELS = ['tb-left', 'tb-right', 'sidebar']; // контейнеры с переставляемыми кнопками
const DROP = PANELS.map((id) => '#' + id).join(',');
const ID_MIGRATIONS = { bc: 'img-settings', mono: null };
const ALLOWED = {
  'tb-left': new Set(['docsbtn', 'imp-btn', 'export-btn', 'prev', 'refbtn']),
  'tb-right': new Set(['layers', 'activewrap']),
  sidebar: new Set(['t-pencil', 't-eraser', 't-fill', 't-shape', 't-move', 't-adjust', 't-select', 't-lasso',
    'sym', 'tile-btn', 'pp', 'stab', 'flip-h', 'crop', 'center', 'zoom']),
};
// кнопки, переехавшие в панель слоёв (#lay-act-top): старый сохранённый порядок
// тулбара не должен утаскивать их обратно appendChild-ом
const MOVED_OUT = new Set(['fx-btn', 'img-settings', 'bc']);
let squelchUntil = 0;
const squelch = () => { squelchUntil = performance.now() + 350; };
const allowedIn = (panelId, buttonId) => !!(ALLOWED[panelId] && ALLOWED[panelId].has(buttonId));

function save() { const order = {};
  for (const id of PANELS) { const c = $(id); if (c) order[id] = [...c.children].filter((b) => b.id && allowedIn(id, b.id)).map((b) => b.id); }
  try { localStorage.setItem(STORE, JSON.stringify(order)); } catch (e) {} }

function applySaved() { let order; try { order = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {} if (!order) return;
  for (const id of PANELS) { const c = $(id); if (!c || !order[id]) continue;
    for (const raw of order[id]) { if (MOVED_OUT.has(raw)) continue; // не тащим назад на тулбар кнопки, ушедшие в панель слоёв
      const bid = Object.hasOwn(ID_MIGRATIONS, raw) ? ID_MIGRATIONS[raw] : raw;
      if (!bid || !allowedIn(id, bid)) continue;
      const b = bid && document.getElementById(bid); if (b) c.appendChild(b); } } save(); }

export function mount() {
  applySaved();
  for (const id of PANELS) { const c = $(id); if (!c) continue;
    for (const b of [...c.children]) { if (b.tagName !== 'BUTTON' || !b.id || !allowedIn(id, b.id)) continue; b.classList.add('pbtn');
      attachReorder(b, { dropSel: DROP, itemSel: '.pbtn', save, squelch, accept: (el, cont) => allowedIn(cont.id, el.id) });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', (e) => { if (performance.now() < squelchUntil) { e.stopPropagation(); e.preventDefault(); } }, true); // не активировать после перетаскивания
    } }
}
