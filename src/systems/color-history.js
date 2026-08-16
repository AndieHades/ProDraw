// История использованных на холсте цветов: ряд свотчей под пикером, в
// localStorage. Часть Color Picker — отдельный модуль ради размера. Клик по
// свотчу делегируется обратно в пикер через колбэк, заданный initColorHistory.
import { $ } from '../core/dom.js';
import { rgbToHex } from '../logic/color.js';

const STORE = 'pixel-heart:color-used-history';
const key = (c) => (c ? c.slice(0, 3).join(',') : '');
let hist = [], pick = () => {};

function load() {
  try { hist = JSON.parse(localStorage.getItem(STORE) || '[]').filter((c) => Array.isArray(c) && c.length >= 3).map((c) => c.slice(0, 3)); }
  catch (e) { hist = []; }
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(hist)); } catch (e) {} }

export function renderColorHistory() {
  const host = $('col-hist'); if (!host) return; host.innerHTML = '';
  for (const c of hist.slice(0, 10)) { const b = document.createElement('button'), hex = rgbToHex(c).toUpperCase();
    b.type = 'button'; b.style.background = hex; b.title = hex; b.onclick = () => pick(c); host.appendChild(b); }
}

// добавить реально использованный цвет в начало (без дублей), не более 10
export function rememberUsedColor(c) {
  if (!Array.isArray(c) || c.length < 3) return;
  hist = [c.slice(0, 3), ...hist.filter((x) => key(x) !== key(c))].slice(0, 10);
  save(); renderColorHistory();
}

export function clearColorHistory() { hist = []; save(); renderColorHistory(); }

// onPick(c) — что делать при клике по свотчу истории (выбрать цвет в пикере)
export function initColorHistory(onPick) { pick = onPick; load(); renderColorHistory(); }
