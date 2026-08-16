import { S } from './core/state.js';
import * as bus from './core/bus.js';
import { $ } from './core/dom.js';
import { floatingWindow, nextFloatingZ } from './core/floating-window.js';
import { fitView } from './systems/render/index.js';
import { detect, applyDom } from './i18n/index.js';
import { applyTheme } from './styles/theme.js';
import { refreshColors } from './styles/canvas-colors.js';
import * as palette from './systems/palette.js';
import * as brushBar from './systems/brush-bar.js';
import * as brushResize from './systems/brush-resize.js';
import * as colorPicker from './systems/color-picker.js';
import * as toolbars from './systems/toolbars.js';
import * as grid from './systems/grid.js';
import * as tile from './systems/tile.js';
import * as symmetryLines from './systems/symmetry-lines.js';
import * as layersUI from './systems/layers/index.js';
import * as brushLibrary from './systems/brush-library/index.js';
import * as fontLibrary from './systems/font-library/index.js';
import * as importSys from './systems/import/index.js';
import * as importEditor from './systems/import/editor.js';
import * as exportSys from './systems/export/index.js';
import * as palManager from './systems/palette-manager.js';
import * as shading from './systems/shading.js';
import * as tintShade from './systems/tint-shade/index.js';
import * as preview from './systems/preview-window.js';
import * as reference from './systems/reference-window.js';
import * as input from './systems/input/index.js';
import * as crop from './systems/crop.js';
import * as transform from './systems/transform/index.js';
import * as effects from './systems/effects/index.js';
import * as bc from './systems/brightness-contrast.js';
import * as adjust from './systems/draw/adjust.js';
import * as gallery from './systems/gallery/index.js';
import * as newCanvas from './systems/new-canvas.js';
import * as settings from './systems/settings.js';
import * as panels from './systems/panels.js';
import * as selBar from './systems/selection/bar.js';
import * as lasso from './systems/freehand/panel.js';
import * as eyedropper from './systems/eyedropper/index.js';
import * as penButton from './systems/pen-button.js';
import * as status from './systems/status.js';
import * as toolpops from './systems/toolpops.js';
import * as tilePalette from './systems/tile-palette/index.js';
import * as tilemapDialog from './systems/tilemap-dialog.js';
import * as tilemapCreate from './systems/tilemap-create.js';
import * as tilemapOverlay from './systems/tilemap-overlay.js';
import * as tilesetMode from './systems/tileset-mode/index.js';
import * as tileFromLayer from './systems/tile-from-layer.js';
import * as tilesetManager from './systems/tileset-manager.js';
import * as textTool from './systems/text-tool/index.js';
import * as animation from './systems/animation/index.js';
import './systems/draw/tools.js';
import './systems/move-tool.js';
import './systems/selection/input.js';
import './systems/selection/handles.js';
import './systems/selection/clipboard.js';
import './systems/freehand/input.js';
import './systems/rotate-canvas.js';
import './systems/flip.js';
import './systems/trim.js';
import './systems/layer-center.js';
import './systems/mono.js';
import './systems/recolor.js';
import './systems/free-rotate.js';
import { mount as mountKeyboard } from './systems/keyboard/index.js';
import * as xMirror from './systems/x-mirror.js';
import './systems/tile-brush/index.js';
import './systems/tile-selection/index.js';
import './systems/tile-variants.js';
import './systems/tilemap-export.js';
import './systems/tilemap-paint/index.js';

const MOUNTS = [palette, brushBar, brushResize, colorPicker, toolbars, grid, symmetryLines, layersUI, brushLibrary, fontLibrary, importSys, importEditor, exportSys, palManager, shading, tintShade, preview, reference, animation, input, crop, transform, effects, bc, adjust, gallery, newCanvas, settings, panels, selBar, lasso, eyedropper, penButton, status, toolpops, xMirror, tile, tilePalette, tilemapDialog, tilemapCreate, tilemapOverlay, tilesetMode, tileFromLayer, tilesetManager, textTool];

const px = (v, fallback = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };
function sidebarMetrics() {
  const bar = $('sidebar'), cs = window.getComputedStyle(bar);
  const buttons = [...bar.querySelectorAll('button')];
  const bcs = buttons[0] ? window.getComputedStyle(buttons[0]) : null;
  return {
    n: buttons.length,
    btnW: px(bcs && bcs.width, 38),
    btnH: px(bcs && bcs.height, 38),
    gap: px(cs.rowGap || cs.gap, 2),
    padT: px(cs.paddingTop, 14),
    padB: px(cs.paddingBottom, 10),
    padL: px(cs.paddingLeft, 5),
    padR: px(cs.paddingRight, 5),
    borderL: px(cs.borderLeftWidth, 1),
    borderR: px(cs.borderRightWidth, 1),
  };
}
function sidebarMinHeight(width) {
  const m = sidebarMetrics();
  if (!m.n) return 80;
  const contentW = Math.max(m.btnW, width - m.padL - m.padR - m.borderL - m.borderR);
  const cols = Math.min(2, Math.max(1, Math.floor((contentW + m.gap) / (m.btnW + m.gap))));
  const rows = Math.ceil(m.n / cols);
  return Math.ceil(m.padT + m.padB + rows * m.btnH + Math.max(0, rows - 1) * m.gap);
}
function resizeSidebar(w, h) {
  const bar = $('sidebar'), m = sidebarMetrics();
  const minW = m.btnW + m.padL + m.padR + m.borderL + m.borderR;
  const maxW = Math.min(window.innerWidth - 12, m.btnW * 2 + m.gap + m.padL + m.padR + m.borderL + m.borderR);
  const requested = Math.max(minW, Math.min(maxW, w));
  const width = requested > (minW + maxW) / 2 ? maxW : minW;
  const minH = sidebarMinHeight(width);
  bar.style.width = width + 'px';
  bar.style.minHeight = minH + 'px';
  bar.style.maxHeight = Math.max(minH, Math.min(window.innerHeight - 12, h)) + 'px';
}
function paletteChromeHeight() {
  const bar = $('palbar'), pal = $('pal'), cs = window.getComputedStyle(bar);
  return [...bar.children].filter((el) => el !== pal && window.getComputedStyle(el).position !== 'absolute')
    .reduce((sum, el) => sum + el.getBoundingClientRect().height, px(cs.borderTopWidth, 1) + px(cs.borderBottomWidth, 1));
}
function resizePaletteWindow(w, h) {
  $('palbar').style.width = Math.max(130, Math.min(innerWidth - 12, w)) + 'px';
  $('pal').style.height = Math.max(38, Math.min(innerHeight * 0.6, h - paletteChromeHeight())) + 'px';
}
function resetPaletteWindow() {
  const bar = $('palbar'), pal = $('pal'), cs = window.getComputedStyle(bar);
  const cols = px(cs.getPropertyValue('--pal-default-cols'), 6), cell = px(cs.getPropertyValue('--pal-cell'), 34), pad = px(cs.getPropertyValue('--pal-pad'), 8);
  bar.style.width = Math.min(window.innerWidth - 12, cols * cell + pad * 2 + px(cs.borderLeftWidth, 1) + px(cs.borderRightWidth, 1)) + 'px'; pal.style.height = '';
}

export function start() {
  detect(); applyTheme(); refreshColors();
  for (const m of MOUNTS) if (m.mount) m.mount();
  mountKeyboard();
  applyDom(); // проставить переводы в статичный UI

  floatingWindow($('palbar'), { grip: $('palgrip'), handle: $('palrsz'), storeKey: 'palwin', clampBottom: 50,
    onClose: () => $('palbar').classList.add('closed'), // крестик прячет палитру; вернуть — кружком цвета
    onHeaderDblClick: resetPaletteWindow,
    onResize: resizePaletteWindow });
  resizeSidebar(px(window.getComputedStyle($('sidebar')).width, 50), sidebarMinHeight(50));
  floatingWindow($('sidebar'), { grip: $('sb-grip'), handle: $('sb-rsz'), storeKey: 'sbwin', minW: 38, clampRight: 46, clampBottom: 60,
    onResize: resizeSidebar }); // сайдбар — в общем порядке: последний тронутый сверху (без alwaysOnTop)
  $('topbar').addEventListener('pointerdown', () => { $('topbar').style.zIndex = nextFloatingZ(); }, true); // верхняя панель — в общий порядок, поднимается по тапу
  for (const id of ['selbar', 'cropbar', 'rotbar']) {
    const bar = $(id); if (bar) floatingWindow(bar, { grip: bar.querySelector('.crop-head') || bar, storeKey: 'action-' + id, minW: 120, minH: 44, clampBottom: 64, avoidOverlap: false });
  }
  for (const win of document.querySelectorAll('.ovl .sheet, .ovl .new-panel, .ovl .tilemap-panel')) floatingWindow(win, { grip: win.querySelector('.new-head, .tilemap-head, .pop-head, h3') || win, storeKey: win.id ? 'win-' + win.id : undefined });

  for (const id of ['ovl', 'new-ovl', 'ren-ovl', 'tools-ovl']) $(id).addEventListener('click', (e) => {
    const el = $(id), openedAt = +(el.dataset.openedAt || 0);
    if (e.target.id === id && Date.now() - openedAt > 500) el.classList.remove('on');
  }); // рабочие модальные окна не закрываем по фону — только крестиком/явной кнопкой
  document.addEventListener('pointerdown', (e) => { // контекстные меню закрываются кликом мимо (это не окна)
    for (const id of ['ctx', 'lctx', 'cctx', 'sctx', 'trctx', 'fxctx', 'impmenu', 'setmenu', 'rowctx', 'tctx', 'brush-plus', 'brush-menu', 'font-menu', 'brush-choice', 'shape-choice', 'sym-choice', 'flip-choice', 'center-choice', 'zoom-choice', 'pal-new-choice']) {
      const m = $(id); if (m && m.classList.contains('on') && !m.contains(e.target)) m.classList.remove('on');
    } }, true);
  $('ovlclose').onclick = () => $('ovl').classList.remove('on');
  window.addEventListener('blur', () => { // защита: не оставлять призрак/состояние драга при потере фокуса (скриншот, alt-tab)
    document.querySelectorAll('.drag-ghost, .gal-drag-ghost').forEach((g) => g.remove());
    document.querySelectorAll('.drop-gap').forEach((g) => g.remove());
    document.querySelectorAll('.dragging, .lift, .lifting, .over, .drop-into, .drop-before, .drop-above, .drop-below').forEach((n) => n.classList.remove('dragging', 'lift', 'lifting', 'over', 'drop-into', 'drop-before', 'drop-above', 'drop-below')); });

  requestAnimationFrame(() => { fitView(); });
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
}

start();
window.__app = { S, bus, start }; // для headless-boot теста
