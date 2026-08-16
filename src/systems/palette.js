// Палитра (рендер): отрисовка свотчей, активный цвет, добавление, режим
// «использованные». Интерактив (выделение/drag/контекст-меню) — в
// palette-select.js. Перекраска/выбор по цвету — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { rgb, rgbToHex, hexToRgb, eqc } from '../logic/color.js';
import { sortPalette } from '../logic/palette-sort.js';
import { setTool } from '../core/tools.js';
import { effVis } from '../core/layers.js';
import { initPaletteSelect, wireSwatch, clearPaletteSelection, selectedPaletteColors, validSel } from './palette-select.js';
import { attachReorder } from '../core/reorder-drag.js';

let showUsed = false;
const COLOR_TOOLS = new Set(['pencil', 'fill', 'line', 'rect', 'ellipse']);

export const refreshActive = () => { $('active').style.background = rgb(S.active); };
const colorKey = (c) => c ? c[0] + ',' + c[1] + ',' + c[2] : '';
const inShadeRamp = (c) => S.shading && S.shading.picking && S.shading.colors && S.shading.colors.some((x) => eqc(x, c));
const keepsColorTool = () => COLOR_TOOLS.has(S.tool) || (S.tool === 'adjust' && S.adjMode === 'colorize');
function syncShadingButton() {
  const btn = $('pal-shading'); if (!btn) return;
  const on = !!(S.shading && S.shading.on), canStart = selectedPaletteColors().length > 1;
  btn.classList.toggle('on', on); btn.disabled = !on && !canStart;
}

function usedColorKeys() { const keys = new Set();
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!L || !effVis(i) || L.opacity <= 0) continue;
    for (const row of L.grid) for (const c of row) if (c && c[3] > 0) keys.add(colorKey(c));
    for (const c of (L.ext || new Map()).values()) if (c && c[3] > 0) keys.add(colorKey(c)); }
  return keys;
}

// «использованные» в реальном времени: при включённом showUsed обновляем только
// классы .used на готовых свотчах (без пересборки DOM каждый кадр рисования)
function refreshUsed() {
  if (!showUsed) return;
  const used = usedColorKeys();
  for (const b of $('pal').querySelectorAll('.sw:not(.plus)')) {
    const c = S.palette[+b.dataset.i]; b.classList.toggle('used', !!(c && used.has(colorKey(c))));
  }
}

function addRgbColor(c, notify = false) {
  if (!c) return false;
  if (S.palette.some((p) => eqc(p, c))) { if (notify) toast(t('toast.colorExists')); return false; }
  S.palette.push(c.slice(0, 3)); bus.emit('palette');
  if (notify) toast(t('toast.colorAdded'));
  return true;
}

export function setActiveColor(c, pickTool = true) {
  S.active = c.slice(); refreshActive();
  bus.emit('color-sync'); buildPalette();
  if (pickTool && !keepsColorTool()) setTool('pencil');
}

export function addColor(hex) { const c = hexToRgb(hex); addRgbColor(c); setActiveColor(c); }

actions.register('palette.add', addColor);
actions.register('palette.addRgb', (c) => addRgbColor(c, true));
actions.register('color.setActive', (c) => setActiveColor(c, false)); // Active Color Manager: пипетка/источники ставят активный цвет, не меняя инструмент
// упорядочить палитру по тону и светлоте (кнопку добавим позже — пока через action)
actions.register('palette.sort', () => { S.palette = sortPalette(S.palette); bus.emit('palette'); });

export function buildPalette() {
  validSel(); // согласовать выделение с текущей палитрой до отрисовки
  const box = $('pal'); box.innerHTML = '';
  $('palgrip-label').textContent = t('label.paletteN', { n: S.palette.length });
  const used = showUsed ? usedColorKeys() : null;
  let activeShown = false;
  S.palette.forEach((c, idx) => {
    const b = document.createElement('button'); b.className = 'sw'; b.style.background = rgb(c); b.dataset.i = idx;
    b.title = rgbToHex(c).toUpperCase();
    if (!activeShown && eqc(c, S.active)) { b.classList.add('on'); activeShown = true; }
    if (inShadeRamp(c)) b.classList.add('shade-sel');
    if (used && used.has(colorKey(c))) b.classList.add('used');
    wireSwatch(b, c, idx); // выделение/drag/контекст-меню + класс pal-sel
    box.appendChild(b);
  });
  const add = document.createElement('button'); add.className = 'sw plus'; add.title = t('palette.addActiveTitle');
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  add.addEventListener('click', () => { if (S.palette.some((p) => eqc(p, S.active))) { toast(t('toast.colorExists')); return; }
    S.palette.push(S.active.slice()); buildPalette(); toast(t('toast.colorAdded')); });
  add.addEventListener('contextmenu', (e) => { e.preventDefault(); actions.run('color.pick'); });
  box.appendChild(add);
  syncShadingButton();
}

function toggleShading() { actions.run('tool.shading', selectedPaletteColors()); }

export function mount() {
  initPaletteSelect({ rebuild: buildPalette, setActive: setActiveColor });
  $('pal-shading').onclick = toggleShading;
  $('pal-used').addEventListener('click', () => { showUsed = !showUsed; $('pal-used').classList.toggle('on', showUsed); buildPalette(); });
  bus.on('palette', () => { buildPalette(); refreshActive(); });
  bus.on('render', refreshUsed); // живое обновление «использованных» цветов прямо во время рисования
  bus.on('shading', syncShadingButton);
  bus.on('tool', (id) => { if (id !== 'pencil') clearPaletteSelection(); });
  bus.on('locale', buildPalette);
  wirePalActReorder();
  refreshActive(); buildPalette(); syncShadingButton();
}

// перенос иконок тулбара палитры зажатым ПКМ/долгим тапом (как в тулбаре тайлов)
function wirePalActReorder() {
  const bar = $('pal-act'); if (!bar) return; let sq = 0;
  const squelch = () => { sq = performance.now() + 350; };
  const save = () => { try { localStorage.setItem('palActOrder', JSON.stringify([...bar.children].map((b) => b.id))); } catch (e) {} };
  try { const o = JSON.parse(localStorage.getItem('palActOrder')); if (Array.isArray(o)) for (const id of o) { const b = $(id); if (b) bar.appendChild(b); } } catch (e) {}
  bar.addEventListener('click', (e) => { if (performance.now() < sq) { e.stopPropagation(); e.preventDefault(); } }, true);
  for (const b of [...bar.children]) if (b.tagName === 'BUTTON') { b.addEventListener('contextmenu', (e) => e.preventDefault()); attachReorder(b, { dropSel: '#pal-act', itemSel: '#pal-act button', save, squelch }); }
}
