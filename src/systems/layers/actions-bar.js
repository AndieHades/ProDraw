// Два бара действий панели слоёв: команды, активные состояния и перестановка
// кнопок ПКМ/долгим тапом между верхней и нижней строкой.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.ts';
import { $ } from '../../ui/dom/ShellDom.ts';
import { attachReorder } from '../../ui/shell/ReorderGesture.ts';
import { folderLayers, selectedIdx } from './helpers.js';
import {
  clearLayerRef, deleteLayer, doAddLayer, doGroup, doMerge, duplicateFolder, duplicateLayer,
  symmetrizeLayerRefs, toggleAlphaLock, toggleClip, toggleLock, toggleReference,
} from './ops.js';

const STORE = 'layerActionBars';
const BARS = ['lay-act-top', 'lay-act-bottom'];
const DROP = BARS.map((id) => '#' + id).join(',');
let squelchUntil = 0;
let layoutChanged = () => {};

const curLayer = () => S.layers[S.cur];
const activeFolder = () => (S.selFolder == null ? null : S.folders.find((f) => f.id === S.selFolder));
const withLayer = (fn) => { const L = curLayer(); if (L) fn(L); };
const squelch = () => { squelchUntil = performance.now() + 350; };

function targets() {
  if (S.bgSel) return S.layers.filter(Boolean); // выбран фон → весь документ
  const f = activeFolder(); if (f) return folderLayers(f).filter((L) => S.layers.includes(L));
  return selectedIdx().map((i) => S.layers[i]).filter(Boolean);
}

function duplicateActive() {
  const f = activeFolder(); if (f) duplicateFolder(f); else withLayer(duplicateLayer);
}

function symmetrizeActive() {
  symmetrizeLayerRefs(targets());
}

function saveOrder(movedButton) {
  rebalanceLayerActionBars(movedButton);
  const order = {};
  for (const id of BARS) { const c = $(id); if (c) order[id] = [...c.children].filter((b) => b.id).map((b) => b.id); }
  try { localStorage.setItem(STORE, JSON.stringify(order)); } catch (e) {}
  layoutChanged();
}

function applySavedOrder() {
  let order; try { order = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  if (!order) return;
  for (const id of BARS) { const c = $(id); if (!c || !order[id]) continue;
    for (const bid of order[id]) { const b = $(bid); if (b) c.appendChild(b); } }
}

const buttons = (bar) => [...(bar?.children || [])].filter((b) => b.tagName === 'BUTTON' && b.id);

export function rebalanceLayerActionBars(movedButton) {
  const top = $(BARS[0]), bottom = $(BARS[1]); if (!top || !bottom) return;
  while (buttons(top).length > buttons(bottom).length) {
    const moving = buttons(top).findLast((button) => button !== movedButton), del = $('lay-del');
    if (!moving) break;
    bottom.insertBefore(moving, del?.parentElement === bottom ? del : null);
  }
  while (buttons(bottom).length > buttons(top).length) {
    const moving = buttons(bottom).find((button) => button !== movedButton && button.id !== 'lay-del');
    if (!moving) break;
    top.appendChild(moving);
  }
}

function wireReorder() {
  applySavedOrder(); saveOrder();
  for (const id of BARS) { const c = $(id); if (!c) continue;
    for (const b of [...c.children]) { if (b.tagName !== 'BUTTON' || !b.id) continue;
      b.classList.add('lay-action-btn');
      attachReorder(b, { dropSel: DROP, itemSel: '.lay-action-btn', save: () => saveOrder(b), squelch });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', (e) => { if (performance.now() < squelchUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
    } }
}

export function syncLayerActionButtons() {
  const L = curLayer(), on = (id, v) => { const b = $(id); if (b) b.classList.toggle('on', !!v); };
  on('lay-alpha', L && L.alphaLock); on('lay-clip', L && L.clip);
  on('lay-ref', L && L.reference); on('lay-lock', L && L.lock);
}

let barsBound = false;
export function mountActionBars(onLayoutChange) {
  if (onLayoutChange) layoutChanged = onLayoutChange;
  if (barsBound) { wireReorder(); syncLayerActionButtons(); return; } // идемпотентно: клики вешаем один раз, иначе повторный mount дублирует обработчики
  barsBound = true;
  $('lay-add').addEventListener('click', doAddLayer);
  $('lay-group').addEventListener('click', doGroup);
  $('lay-alpha').addEventListener('click', () => withLayer(toggleAlphaLock));
  $('lay-clip').addEventListener('click', () => withLayer(toggleClip));
  $('lay-ref').addEventListener('click', () => withLayer(toggleReference));
  $('lay-clean').addEventListener('click', () => { if (S.bgSel) { actions.run('bg.clear'); return; } withLayer(clearLayerRef); }); // фон выбран → очистить фон (прозрачный)
  $('lay-dup').addEventListener('click', duplicateActive);
  $('lay-symm').addEventListener('click', symmetrizeActive);
  $('lay-merge').addEventListener('click', doMerge);
  $('lay-select').addEventListener('click', () => actions.run('selection.layer'));
  $('lay-lock').addEventListener('click', () => withLayer(toggleLock));
  $('lay-del').addEventListener('click', deleteLayer);
  wireReorder(); syncLayerActionButtons();
}
