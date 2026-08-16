// Tint & Shade Generator: окно генерации оттенков/гармоний от выбранного цвета палитры.
// Логика генерации — в logic/tint-shade.js; здесь оркестрация UI и операции над палитрой.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $, toast, t } from '../../core/dom.js';
import { eqc } from '../../logic/color.js';
import { floatingWindow } from '../../core/floating-window.js';
import { tsg, toggleSel, openWith } from './store.js';
import { render, setHandlers } from './render.js';

function parseHex(s) {
  const raw = (s || '').trim().replace(/^#/, '');
  const full = /^[0-9a-f]{3}$/i.test(raw) ? raw.split('').map((x) => x + x).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export function addSelectedToCurrentPalette(colors) {
  let n = 0;
  for (const c of colors) if (!S.palette.some((p) => eqc(p, c))) { S.palette.push(c.slice(0, 3)); n++; }
  bus.emit('palette'); return n;
}

export function createNewPaletteFromSelected(colors) {
  if (!colors.length) return;
  S.palette = colors.map((c) => c.slice(0, 3)); S.active = S.palette[0].slice();
  bus.emit('palette'); bus.emit('render');
}

const tap = (c) => { toggleSel(c); render(); };
const addOne = (c) => { addSelectedToCurrentPalette([c]); toast(t('toast.colorAdded')); render(); };
const close = () => $('tsg-win').classList.remove('on');
function setBaseFromHex(value, normalize = false) {
  const c = parseHex(value), input = $('tsg-basehex');
  input.classList.toggle('bad', !c && value.trim().length > 0);
  if (!c) { if (normalize) render(); return; }
  tsg.base = c; tsg.sel = [];
  render();
}

function open() {
  if (!S.palette.some((p) => eqc(p, S.active))) { toast(t('toast.selectBaseFirst')); return; }
  openWith(S.active); render(); $('tsg-win').classList.add('on');
}

export function mount() {
  setHandlers({ onTap: tap, onAdd: addOne });
  $('tsg-btn').onclick = open; $('tsg-x').onclick = close;
  $('tsg-basehex').addEventListener('input', (e) => setBaseFromHex(e.target.value));
  $('tsg-basehex').addEventListener('blur', (e) => setBaseFromHex(e.target.value, true));
  $('tsg-basehex').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } });
  for (const b of document.querySelectorAll('#tsg-win [data-harm]'))
    b.onclick = () => { tsg.harmony = tsg.harmony === b.dataset.harm ? null : b.dataset.harm; render(); };
  $('tsg-add').onclick = () => { if (!tsg.sel.length) { toast(t('toast.nothingSelected')); return; }
    const n = addSelectedToCurrentPalette(tsg.sel); toast(t('toast.tsgAdded', { n })); };
  $('tsg-create').onclick = () => { if (!tsg.sel.length) { toast(t('toast.nothingSelected')); return; }
    createNewPaletteFromSelected(tsg.sel); toast(t('toast.tsgNewPalette', { n: tsg.sel.length })); }; // окно остаётся — закрыть можно крестиком
  $('tsg-clear').onclick = () => { tsg.sel = []; render(); };
  bus.on('locale', () => { if (tsg.base) render(); });
  floatingWindow($('tsg-win'), { grip: $('tsg-grip'), handle: $('tsg-rsz'), storeKey: 'tsgwin', clampRight: 80,
    onResize: (w) => { $('tsg-win').style.width = Math.max(240, Math.min(innerWidth - 12, w)) + 'px'; } }); // высота — по содержимому, окно растёт вниз
}
