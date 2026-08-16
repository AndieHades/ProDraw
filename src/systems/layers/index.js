// Сборка панели слоёв: кнопки, плавающее окно, прозрачность, картинка-в-слой,
// меню выбора слоя по ПКМ. Список рисует list.js по событию 'layers'.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { effVis } from '../../core/layers.js';
import { floatingWindow } from '../../core/floating-window.js';
import { layList } from './list.js';
import { activeOpacityRef } from './helpers.js';
import { mountActionBars } from './actions-bar.js';
import { mountPinch } from './pinch.js';
import { mountMenu } from './menu.js';
import './fill.js'; // регистрирует action 'layer.dropColorAt'

const vw = () => window.innerWidth || document.documentElement.clientWidth || 1024;
const vh = () => window.innerHeight || document.documentElement.clientHeight || 768;
const cssNum = (v, fallback = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };

function openLayerMenu(px, py) { const m = $('cctx'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = t('menu.pickLayer'); m.appendChild(head);
  for (let i = S.layers.length - 1; i >= 0; i--) { const b = document.createElement('button'); b.textContent = S.layers[i].name;
    if (i === S.cur) b.classList.add('cur'); if (!effVis(i)) b.classList.add('dim');
    b.addEventListener('click', ((idx) => () => { S.cur = idx; layList(); m.classList.remove('on'); })(i)); m.appendChild(b); }
  showMenuAt(m, px, py); }

function expandLayersWindow() {
  layList();
  const pop = $('lay-pop'), list = $('lay-list'), r = pop.getBoundingClientRect(), cs = window.getComputedStyle(pop);
  const chrome = [...pop.children].filter((el) => el !== list && window.getComputedStyle(el).position !== 'absolute')
    .reduce((sum, el) => sum + el.getBoundingClientRect().height, cssNum(cs.borderTopWidth, 1) + cssNum(cs.borderBottomWidth, 1));
  const h = Math.min(vh() - 8, Math.max(220, Math.ceil(chrome + list.scrollHeight)));
  const w = Math.max(240, Math.min(vw() - 12, r.width || 272));
  pop.style.width = w + 'px'; pop.style.height = h + 'px'; pop.style.left = Math.max(4, Math.min(r.left, vw() - w - 4)) + 'px';
  pop.style.top = Math.max(4, Math.min(r.top, vh() - h - 4)) + 'px'; pop.style.right = 'auto'; pop.style.bottom = 'auto'; list.style.maxHeight = 'none';
}

export function mount() {
  $('layers').addEventListener('click', () => { const p = $('lay-pop'); const on = p.classList.toggle('on'); $('layers').classList.toggle('on', on); if (on) layList(); });
  mountActionBars();
  $('lay-op').addEventListener('pointerdown', () => snapshot());
  $('lay-op').addEventListener('input', () => { const ref = activeOpacityRef(); if (!ref) return; // прозрачность активной строки: слой/папка/эффект/настройка
    ref.opacity = +$('lay-op').value / 100; $('lay-opv').textContent = Math.round(ref.opacity * 100) + '%';
    bus.emit('render'); bus.emit('layers'); });
  floatingWindow($('lay-pop'), { grip: $('lay-head'), handle: $('lay-rsz'), storeKey: 'laywin', minW: 240, minH: 220, resizeEdges: true,
    onClose: () => { $('lay-pop').classList.remove('on'); $('layers').classList.remove('on'); },
    onHeaderDblClick: expandLayersWindow,
    onResize: (w, h) => { $('lay-pop').style.width = Math.max(240, Math.min(vw() - 12, w)) + 'px';
      $('lay-pop').style.height = Math.max(220, Math.min(vh() - 12, h)) + 'px';
      $('lay-list').style.maxHeight = 'none'; } }); // высота окна независима от числа слоёв; список занимает свободное место
  mountMenu();
  mountPinch();
  bus.on('layers', layList);
  bus.on('locale', layList);
  bus.on('canvas-menu', (e) => { const L = S.layers[S.cur]; // Tile-слой или открытая палитра тайлов → меню клетки (tileset-mode), не выбор слоя
    if ((L && L.kind === 'tilemap') || (S.tileset && (S.tileset.on || S.tileset.open))) return;
    openLayerMenu(e.clientX, e.clientY); });
  actions.register('ui.layers', () => $('layers').click());
}
