// Рисует содержимое окна генератора: базовый цвет, шкалы тинтов/шейдов, блоки
// гармонии и превью выбранных цветов. Чистый DOM — данные берёт из store и logic.
import { $, t } from '../../core/dom.js';
import { rgb, rgbToHex } from '../../logic/color.js';
import { generateTints, generateShades, generateTintShadeScalesForHarmony } from '../../logic/tint-shade.js';
import { tsg, isSel, allSel, setGroup } from './store.js';

let H = { onTap: () => {}, onAdd: () => {} }; // обработчики из index (выбор / ПКМ-добавление)
export const setHandlers = (h) => { H = h; };

// Галочка у базового цвета: выбрать/снять всю шкалу (тинты + шейды) целиком.
function groupCheck(colors) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'tsg-check';
  if (allSel(colors)) b.classList.add('on');
  b.title = t('tsg.selectAll');
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  b.addEventListener('click', () => { setGroup(colors, !allSel(colors)); render(); });
  return b;
}

function swatch(c) {
  const b = document.createElement('button'); b.className = 'tsg-sw'; b.type = 'button';
  b.style.background = rgb(c); b.title = rgbToHex(c).toUpperCase();
  if (isSel(c)) b.classList.add('on');
  b.addEventListener('click', () => H.onTap(c));
  b.addEventListener('contextmenu', (e) => { e.preventDefault(); H.onAdd(c); });
  return b;
}

function scaleRow(colors, title) {
  const wrap = document.createElement('div'); wrap.className = 'tsg-scale';
  const h = document.createElement('div'); h.className = 'tsg-stitle'; h.textContent = title; wrap.appendChild(h);
  const row = document.createElement('div'); row.className = 'tsg-row';
  colors.forEach((c, i) => {
    const cell = document.createElement('div'); cell.className = 'tsg-cell';
    cell.appendChild(swatch(c));
    const lab = document.createElement('span'); lab.className = 'tsg-lab';
    lab.textContent = i === 0 ? t('tsg.base') : (i * 20) + '%';
    cell.appendChild(lab); row.appendChild(cell);
  });
  wrap.appendChild(row); return wrap;
}

function harmonyBlocks() {
  const wrap = $('tsg-harm'); wrap.innerHTML = '';
  if (!tsg.harmony) return;
  for (const sc of generateTintShadeScalesForHarmony(tsg.base, tsg.harmony)) {
    const block = document.createElement('div'); block.className = 'tsg-block';
    const head = document.createElement('div'); head.className = 'tsg-bhead';
    const dot = document.createElement('span'); dot.className = 'tsg-dot'; dot.style.background = rgb(sc.base);
    const hx = document.createElement('span'); hx.textContent = rgbToHex(sc.base).toUpperCase();
    head.append(dot, hx, groupCheck([...sc.tints, ...sc.shades]));
    block.append(head, scaleRow(sc.tints, t('tsg.tints')), scaleRow(sc.shades, t('tsg.shades')));
    wrap.appendChild(block);
  }
}

function renderSelected() {
  const box = $('tsg-selprev'); box.innerHTML = '';
  for (const c of tsg.sel) {
    const s = document.createElement('span'); s.className = 'tsg-chip';
    s.style.background = rgb(c); s.title = rgbToHex(c).toUpperCase(); box.appendChild(s);
  }
  $('tsg-selcount').textContent = String(tsg.sel.length);
}

export function render() {
  $('tsg-baseprev').style.background = rgb(tsg.base);
  $('tsg-basehex').value = rgbToHex(tsg.base).toUpperCase();
  $('tsg-basehex').classList.remove('bad');
  const tints = generateTints(tsg.base), shades = generateShades(tsg.base);
  const sc = $('tsg-scales'); sc.innerHTML = '';
  sc.append(scaleRow(tints, t('tsg.tints')), scaleRow(shades, t('tsg.shades')));
  const bc = $('tsg-basecheck'); bc.innerHTML = ''; bc.appendChild(groupCheck([...tints, ...shades]));
  harmonyBlocks(); renderSelected();
  for (const b of document.querySelectorAll('#tsg-win [data-harm]')) b.classList.toggle('on', b.dataset.harm === tsg.harmony);
}
