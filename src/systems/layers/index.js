// Сборка панели слоёв: кнопки, плавающее окно, прозрачность, картинка-в-слой,
// меню выбора слоя по ПКМ. Список рисует list.js по событию 'layers'.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, showMenuAt, t } from '../../core/dom.js';
import { effVis } from '../../core/layers.js';
import { floatingWindow } from '../../core/floating-window.js';
import { layList } from './list.js';
import { activeOpacityRef } from './helpers.js';
import { mountActionBars } from './actions-bar.js';
import { mountPinch } from './pinch.js';
import { mountMenu } from './menu.js';
import './fill.js'; // регистрирует action 'layer.dropColorAt'
import { snapshotOpacity } from './metadata.js';

const vw = () => window.innerWidth || document.documentElement.clientWidth || 1024;
const vh = () => window.innerHeight || document.documentElement.clientHeight || 768;
const cssNum = (v, fallback = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };
const actionRows = () => ['lay-act-top', 'lay-act-bottom'].map($).filter(Boolean);

export function layerPanelMinWidth() {
  const pop = $('lay-pop'), root = window.getComputedStyle(document.documentElement);
  const tokenButton = cssNum(root.getPropertyValue('--btn-sm'));
  const tokenGap = cssNum(root.getPropertyValue('--gap'));
  const rowWidths = actionRows().map((row) => {
    const cs = window.getComputedStyle(row), items = [...row.children].filter((el) => el.tagName === 'BUTTON');
    const gap = cssNum(cs.columnGap, cssNum(cs.gap, tokenGap));
    const content = items.reduce((sum, item) => sum + cssNum(window.getComputedStyle(item).width, tokenButton), 0);
    return content + Math.max(0, items.length - 1) * gap + cssNum(cs.paddingLeft) + cssNum(cs.paddingRight);
  });
  const cs = window.getComputedStyle(pop);
  return Math.max(240, Math.ceil(Math.max(0, ...rowWidths) + cssNum(cs.borderLeftWidth) + cssNum(cs.borderRightWidth)));
}

function syncLayerPanelWidth() {
  const pop = $('lay-pop'), minWidth = layerPanelMinWidth(), r = pop.getBoundingClientRect();
  const width = Math.max(minWidth, r.width || cssNum(pop.style.width, 272));
  pop.style.minWidth = minWidth + 'px'; pop.style.width = width + 'px';
  if (r.left + width > vw() - 4) { pop.style.left = Math.max(4, vw() - width - 4) + 'px'; pop.style.right = 'auto'; }
}

function layerPanelContentHeight() {
  const pop = $('lay-pop'), list = $('lay-list'), cs = window.getComputedStyle(pop);
  const chrome = [...pop.children].filter((el) => el !== list && window.getComputedStyle(el).position !== 'absolute')
    .reduce((sum, el) => sum + el.getBoundingClientRect().height, cssNum(cs.borderTopWidth, 1) + cssNum(cs.borderBottomWidth, 1));
  return Math.ceil(chrome + list.scrollHeight);
}

export function layerPanelMinHeight() {
  const pop = $('lay-pop'), r = pop.getBoundingClientRect();
  const top = Math.max(4, Math.min(r.top, vh() - 224));
  return Math.min(Math.max(220, vh() - top - 4), Math.max(220, layerPanelContentHeight()));
}

export function syncLayerPanelHeight(allowShrink = false) {
  const pop = $('lay-pop'); if (!pop.classList.contains('on')) return;
  const r = pop.getBoundingClientRect(), top = Math.max(4, Math.min(r.top, vh() - 224));
  const maxHeight = Math.max(220, vh() - top - 4), minHeight = layerPanelMinHeight();
  const height = Math.min(maxHeight, allowShrink ? minHeight : Math.max(r.height || 220, minHeight));
  pop.style.top = top + 'px'; pop.style.height = height + 'px'; pop.style.bottom = 'auto';
  $('lay-list').style.maxHeight = 'none';
}

function openLayerMenu(px, py) { const m = $('cctx'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = t('menu.pickLayer'); m.appendChild(head);
  for (let i = S.layers.length - 1; i >= 0; i--) { const b = document.createElement('button'); b.textContent = S.layers[i].name;
    if (i === S.cur) b.classList.add('cur'); if (!effVis(i)) b.classList.add('dim');
    b.addEventListener('click', ((idx) => () => { S.cur = idx; layList(); m.classList.remove('on'); })(i)); m.appendChild(b); }
  showMenuAt(m, px, py); }

function expandLayersWindow() {
  layList();
  const pop = $('lay-pop'), list = $('lay-list'), r = pop.getBoundingClientRect();
  const h = Math.min(vh() - 8, Math.max(220, layerPanelContentHeight()));
  const w = Math.max(layerPanelMinWidth(), Math.min(vw() - 12, r.width || 272));
  pop.style.width = w + 'px'; pop.style.height = h + 'px'; pop.style.left = Math.max(4, Math.min(r.left, vw() - w - 4)) + 'px';
  pop.style.top = Math.max(4, Math.min(r.top, vh() - h - 4)) + 'px'; pop.style.right = 'auto'; pop.style.bottom = 'auto'; list.style.maxHeight = 'none';
}

export function mount() {
  $('layers').addEventListener('click', () => { const p = $('lay-pop'); const on = p.classList.toggle('on'); $('layers').classList.toggle('on', on); if (on) { layList(); syncLayerPanelWidth(); syncLayerPanelHeight(); } });
  mountActionBars(syncLayerPanelWidth);
  const list = $('lay-list'); if (!list.__layerSizeObserver) { list.__layerSizeObserver = new window.MutationObserver(() => syncLayerPanelHeight());
    list.__layerSizeObserver.observe(list, { childList: true, subtree: true }); }
  $('lay-op').addEventListener('pointerdown', () => snapshotOpacity(activeOpacityRef()));
  $('lay-op').addEventListener('input', () => { const ref = activeOpacityRef(); if (!ref) return; // прозрачность активной строки: слой/папка/эффект/настройка
    ref.opacity = +$('lay-op').value / 100; $('lay-opv').textContent = Math.round(ref.opacity * 100) + '%';
    bus.emit('render'); bus.emit('layers'); });
  floatingWindow($('lay-pop'), { grip: $('lay-head'), handle: $('lay-rsz'), storeKey: 'laywin', minW: layerPanelMinWidth, minH: layerPanelMinHeight, resizeEdges: true,
    onClose: () => { $('lay-pop').classList.remove('on'); $('layers').classList.remove('on'); },
    onHeaderDblClick: expandLayersWindow,
    onResize: (w, h) => { $('lay-pop').style.width = Math.max(layerPanelMinWidth(), Math.min(vw() - 12, w)) + 'px';
      $('lay-pop').style.height = Math.max(layerPanelMinHeight(), Math.min(vh() - 12, h)) + 'px';
      $('lay-list').style.maxHeight = 'none'; } }); // высота окна независима от числа слоёв; список занимает свободное место
  mountMenu();
  mountPinch();
  bus.on('layers', layList);
  bus.on('locale', layList);
  bus.on('canvas-menu', (e) => openLayerMenu(e.clientX, e.clientY));
  actions.register('ui.layers', () => $('layers').click());
}
