// Строки эффектов под слоем/папкой — ведут себя как слои: звезда/имя/глаз,
// выделение (клик/Ctrl), ПКМ-меню (Правка/Копировать/Дублировать/Удалить),
// drag для переноса и переупорядочивания. Верх списка = перёд стека (как у слоёв):
// порядок в .effects (последний = поверх) рисуется сверху вниз.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { t } from '../../core/dom.js';
import { EYE, layList, layDragSquelch } from './list.js';
import { onDoubleTap, onContext } from '../../core/long-press.js';
import { dragRow } from './drag.js';
import { selectRange } from './range-select.js';

let fxUid = 0; // уникальный ключ строки эффекта для дедупликации цели зазора

// ромбовидная «искра» — та же иконка, что на кнопке вызова меню эффектов (#fx-btn)
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4L12 21.5l-2.4-7.1L2.5 12l7.1-2.4z"/></svg>';
const ADJUST = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/></svg>';
const INDENT = 16;

function selectFx(eff, additive) {
  S.bgSel = false;
  if (additive) { if (S.fxSel.has(eff)) { S.fxSel.delete(eff); if (S.fxCur === eff) S.fxCur = [...S.fxSel][0] || null; }
    else { S.fxSel.add(eff); S.fxCur = eff; } }
  else { S.fxSel = new Set([eff]); S.fxCur = eff; S.marked.clear(); S.markedFolders.clear(); }
  layList();
}

function effectRow(target, eff, depth) {
  const sel = S.fxSel.has(eff);
  const row = document.createElement('div');
  row.className = 'fxrow' + (eff === S.fxCur ? ' on' : sel ? ' marked' : '') + (eff.visible === false ? ' fxoff' : '');
  row.style.marginLeft = depth * INDENT + 'px'; row.__eff = eff; row.__owner = target; row.dataset.fxuid = ++fxUid;
  const star = document.createElement('i'); star.className = 'fxstar'; star.innerHTML = eff.type === 'adjustment' ? ADJUST : STAR;
  const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = t('fx.' + eff.type);
  const vis = document.createElement('button'); vis.className = 'eye' + (eff.visible === false ? ' off' : ''); vis.innerHTML = EYE;
  vis.addEventListener('pointerdown', (e) => e.stopPropagation());
  vis.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); eff.visible = eff.visible === false;
    vis.classList.toggle('off', eff.visible === false); row.classList.toggle('fxoff', eff.visible === false); bus.emit('visibility'); bus.emit('render'); });
  row.append(star, nm, vis);
  row.addEventListener('click', (e) => { e.stopPropagation(); if (layDragSquelch) return;
    if (e.shiftKey && selectRange(row)) { layList(); return; } // shift-клик — диапазон от активной строки до этого эффекта
    selectFx(eff, e.ctrlKey || e.metaKey); }); // тап — выбрать
  onDoubleTap(row, () => actions.run('fx.edit', target, eff)); // быстрый двойной тап/клик — правка эффекта/настройки
  onContext(row, (x, y) => { if (!S.fxSel.has(eff)) selectFx(eff, false); actions.run('fx.menu', x, y, target, eff); }); // ПКМ — меню
  dragRow(row, { kind: 'fx', eff, owner: target }); return row;
}

// строки эффектов цели (слой/папка), сверху = последний в .effects (поверх в стеке)
export function appendEffects(box, target, depth) {
  const list = target.effects || [];
  for (let k = list.length - 1; k >= 0; k--) box.appendChild(effectRow(target, list[k], depth));
}
