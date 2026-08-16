// Групповая кнопка "Новая палитра": ЛКМ запускает последний режим, ПКМ открывает
// горизонтальную плашку вариантов на общем tool-choice.
import { $, showMenuAt, t } from '../core/dom.js';

const STORE = 'paletteCreateMode';
const MODES = [
  { mode: 'blank', key: 'palette.new', icon: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>' },
  { mode: 'image', key: 'btn.fromImage', icon: '<svg viewBox="0 0 24 24"><rect x="4.5" y="5" width="15" height="14" rx="2"/><path d="M8 14l2.7-3 3.2 3.8 1.6-1.8 3 3.5"/><circle cx="8.5" cy="8.8" r="1.2"/></svg>' },
  { mode: 'canvas', key: 'palette.fromCanvas', icon: '<svg viewBox="0 0 24 24"><rect x="4.5" y="5" width="15" height="14" rx="2"/><path d="M8 9h8M8 13h5"/><path d="M15.5 15.5l3.2 3.2M18.5 15.5l-3.2 3.2"/></svg>' },
];

let actions = {}, lastMode = null;
const byMode = (mode) => MODES.find((m) => m.mode === mode) || MODES[0];

function readMode() {
  try { return byMode(localStorage.getItem(STORE)).mode; } catch (e) { return MODES[0].mode; }
}

function remember(mode) {
  lastMode = byMode(mode).mode;
  try { localStorage.setItem(STORE, lastMode); } catch (e) {}
}

function run(mode = lastMode) {
  const cfg = byMode(mode); remember(cfg.mode); refreshPaletteCreateChoice();
  const fn = actions[cfg.mode]; if (fn) fn();
}

function buildMenu(menu) {
  menu.innerHTML = '';
  for (const m of MODES) {
    const b = document.createElement('button');
    b.innerHTML = m.icon; b.dataset.i18nTitle = m.key; b.dataset.palCreate = m.mode;
    b.title = t(m.key); b.onclick = () => { menu.classList.remove('on'); run(m.mode); };
    menu.appendChild(b);
  }
}

export function refreshPaletteCreateChoice() {
  const btn = $('pal-new'), menu = $('pal-new-choice'); if (!btn || !menu) return;
  const cfg = byMode(lastMode || readMode());
  btn.innerHTML = cfg.icon; btn.dataset.i18nTitle = cfg.key; btn.title = t(cfg.key);
  for (const b of menu.querySelectorAll('button')) {
    const m = byMode(b.dataset.palCreate); b.title = t(m.key);
    b.classList.toggle('on', b.dataset.palCreate === cfg.mode);
  }
}

export function initPaletteCreateChoice(nextActions) {
  actions = nextActions || {}; lastMode = readMode();
  const btn = $('pal-new'), menu = $('pal-new-choice'); if (!btn || !menu) return;
  buildMenu(menu); refreshPaletteCreateChoice();
  btn.onclick = () => run();
  btn.oncontextmenu = (e) => {
    e.preventDefault(); refreshPaletteCreateChoice();
    const r = btn.getBoundingClientRect(); showMenuAt(menu, r.left + r.width / 2, r.top, true);
  };
}
