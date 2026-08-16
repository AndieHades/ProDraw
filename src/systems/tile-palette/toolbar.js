// Нижний тулбар Tileset Palette (закреплён снизу): Place tile, Draw on Tile/Edit All Tiles
// tile, Random (кубик), менеджер и удаление тайла. Иконки — SVG в
// стиле проекта. Кнопки можно переставлять зажатым ПКМ/долгим тапом (attachReorder).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { setTool } from '../../core/tools.js';
import { t } from '../../core/dom.js';
import { attachReorder } from '../../core/reorder-drag.js';

const STORE = 'tileToolbarOrder4';
let squelchUntil = 0;
const squelch = () => { squelchUntil = performance.now() + 350; };

const IC = {
  place: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.2" fill="currentColor" stroke="none"/><rect x="13" y="13" width="7" height="7" rx="1.2"/><path d="M11.5 7.5H15a2.5 2.5 0 0 1 2.5 2.5v1.5"/><path d="M15.2 9.7l2.3 2.3 2.3-2.3"/></svg>',
  drawTile: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="12" height="12" rx="1.6"/><path d="M8 8h5M8 12h3"/><path d="M13.4 18.8l5.4-5.4a1.45 1.45 0 0 1 2.05 2.05l-5.4 5.4-2.8.7z"/><path d="M17.6 14.6l2 2"/></svg>',
  editTile: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="6" height="6" rx="1"/><rect x="14.5" y="4" width="6" height="6" rx="1"/><rect x="3.5" y="14" width="6" height="6" rx="1"/><path d="M9.5 7h5M6.5 10v4"/><path d="M13.2 18.9l5.2-5.2a1.35 1.35 0 0 1 1.9 1.9l-5.2 5.2-2.6.6z"/><path d="M17.2 14.8l1.9 1.9"/></svg>',
  rnd: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M5 4.5h12l2 2v13H5z"/><path d="M8 4.5v6h8v-6"/><path d="M8 16.5h8"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4.5 6.5h15"/><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M6.5 6.5l.8 11.7A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8l.8-11.7"/><path d="M10 10.5v6M14 10.5v6"/></svg>',
};

function placeTile() { S.tileMode = 'paint'; setTool('tilebrush'); bus.emit('tileset-changed'); }

// id → { html|letter, title, run, mark }
const DEFS = {
  place: { html: IC.place, title: () => t('tile.place'), run: placeTile, mark: 'place' },
  drawtile: { html: IC.drawTile, title: () => t('tile.auto'), run: () => actions.run('tile.auto'), mark: 'drawtile' },
  edittile: { html: IC.editTile, title: () => t('tile.manual'), run: () => actions.run('tile.manual'), mark: 'edittile' },
  rnd: { html: IC.rnd, title: () => t('tile.random'), run: () => actions.run('tile.random'), mark: 'rnd' },
  save: { html: IC.save, title: () => t('tile.loadSet'), run: () => actions.run('tileset.manager') },
  del: { html: IC.del, title: () => t('tile.delete'), run: () => actions.run('tile.delActive') },
};
const DEFAULT_ORDER = ['place', 'drawtile', 'edittile', 'rnd', 'save', 'del'];
const ALIAS = { draw: 'place', auto: 'drawtile', manual: 'edittile' };
const savedOrder = () => { try { const a = JSON.parse(localStorage.getItem(STORE));
  return Array.isArray(a) ? [...new Set(a.map((id) => ALIAS[id] || id))] : null; } catch (e) { return null; } };
function saveOrder() { const bar = document.getElementById('tile-act'); if (!bar) return;
  try { localStorage.setItem(STORE, JSON.stringify([...bar.children].map((b) => b.dataset.tb))); } catch (e) {} }

function makeBtn(id) { const d = DEFS[id]; const b = document.createElement('button'); b.dataset.tb = id; b.title = d.title();
  if (d.size) { b.textContent = S.tileGrid.size; b.classList.add('tile-modebtn'); }
  else if (d.html) b.innerHTML = d.html; else { b.textContent = d.letter; b.classList.add('tile-modebtn'); }
  if (d.mark) b.dataset.mark = d.mark;
  b.addEventListener('click', (e) => { if (performance.now() < squelchUntil) { e.preventDefault(); return; } d.run(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  attachReorder(b, { dropSel: '#tile-act', itemSel: '#tile-act button', save: saveOrder, squelch });
  return b; }

export function buildToolbar() {
  const bar = document.createElement('div'); bar.className = 'lay-act tile-act'; bar.id = 'tile-act';
  const order = savedOrder() || DEFAULT_ORDER;
  for (const id of order) if (DEFS[id]) bar.appendChild(makeBtn(id));
  for (const id of DEFAULT_ORDER) if (!order.includes(id)) bar.appendChild(makeBtn(id)); // новые кнопки после обновления
  return bar;
}

// подсветка активного режима/инструмента
export function syncToolbar() {
  const bar = document.getElementById('tile-act'); if (!bar) return;
  const set = (mark, on) => { const b = bar.querySelector('[data-mark="' + mark + '"]'); if (b) b.classList.toggle('on', on); };
  const pixel = S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'fill';
  set('place', S.tool === 'tilebrush' && S.tileMode === 'paint');
  set('drawtile', pixel && S.tileAutoMode === 'auto');
  set('edittile', pixel && S.tileAutoMode === 'manual');
  set('rnd', S.tileRandom);
}
