// Два бара действий панели слоёв: команды, активные состояния и перестановка
// кнопок ПКМ/долгим тапом между верхней и нижней строкой.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.js';
import { $, t } from '../../core/dom.js';
import { attachReorder } from '../../core/reorder-drag.js';
import { isTilemap } from '../../core/tilemap.js';
import { folderLayers, selectedIdx } from './helpers.js';
import {
  clearLayerRef, deleteLayer, doAddLayer, doGroup, doMerge, duplicateFolder, duplicateLayer,
  symmetrizeLayerRefs, toggleAlphaLock, toggleClip, toggleLock, toggleReference,
} from './ops.js';

const STORE = 'layerActionBars';
const BARS = ['lay-act-top', 'lay-act-bottom'];
const DROP = BARS.map((id) => '#' + id).join(',');
let squelchUntil = 0;

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

function saveOrder() {
  const order = {};
  for (const id of BARS) { const c = $(id); if (c) order[id] = [...c.children].filter((b) => b.id).map((b) => b.id); }
  try { localStorage.setItem(STORE, JSON.stringify(order)); } catch (e) {}
}

function applySavedOrder() {
  let order; try { order = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  if (!order) return;
  for (const id of BARS) { const c = $(id); if (!c || !order[id]) continue;
    for (const bid of order[id]) { const b = $(bid); if (b) c.appendChild(b); } }
}

function wireReorder() {
  applySavedOrder();
  for (const id of BARS) { const c = $(id); if (!c) continue;
    for (const b of [...c.children]) { if (b.tagName !== 'BUTTON' || !b.id) continue;
      b.classList.add('lay-action-btn');
      attachReorder(b, { dropSel: DROP, itemSel: '.lay-action-btn', save: saveOrder, squelch });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', (e) => { if (performance.now() < squelchUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
    } }
}

export function syncLayerActionButtons() {
  const L = curLayer(), on = (id, v) => { const b = $(id); if (b) b.classList.toggle('on', !!v); };
  on('lay-alpha', L && L.alphaLock); on('lay-clip', L && L.clip);
  on('lay-ref', L && L.reference); on('lay-lock', L && L.lock);
  const primaryLayer = !S.bgSel && S.selFolder == null && !S.fxCur ? L : null;
  const tmap = $('lay-tmap'), isTm = isTilemap(primaryLayer);
  if (tmap) { tmap.classList.toggle('on', isTm); tmap.dataset.i18nTitle = isTm ? 'menu.convertLayer' : 'menu.convertTile'; tmap.title = t(tmap.dataset.i18nTitle); }
}

let barsBound = false;
export function mountActionBars() {
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
