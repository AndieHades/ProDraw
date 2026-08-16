// Строка фон-слоя Background внизу списка: свотч цвета, имя, глаз. Не
// перетаскивается, без эффектов; выбирается только в одиночку. Контекст-меню —
// общее #lctx (kind='background'): Залить активным цветом / Очистить (прозрачный).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { t } from '../../core/dom.js';
import { menuGesture } from '../../core/long-press.js';
import { rgb } from '../../logic/color.js';
import { EYE } from './list.js';
import { openLctx } from './menu.js';

export function selectBackground() { // фон выбирается один, сбрасывая всё остальное
  S.bgSel = true; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  bus.emit('layers');
}

export function bgRow() {
  const row = document.createElement('div'); row.className = 'bgrow' + (S.bgSel ? ' on' : ''); row.dataset.bg = '1';
  const sw = document.createElement('i'); sw.className = 'bg-sw' + (S.bg.color ? '' : ' transparent'); if (S.bg.color) sw.style.background = rgb(S.bg.color);
  const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = t('layer.background');
  const vis = document.createElement('button'); vis.className = 'eye' + (S.bg.visible ? '' : ' off'); vis.innerHTML = EYE; // фон можно скрыть
  vis.addEventListener('pointerdown', (e) => e.stopPropagation());
  vis.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); S.bg.visible = !S.bg.visible; vis.classList.toggle('off', !S.bg.visible); bus.emit('render'); });
  row.append(sw, nm, vis);
  row.addEventListener('click', selectBackground);
  menuGesture(row, (x, y) => { selectBackground(); openLctx(x, y, 'background', null); }, '.eye'); // ПКМ/долгий тап → общее меню (фон)
  return row;
}
