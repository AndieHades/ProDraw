// Кнопки панелей: инструменты, переключатели (симметрия/pp/стабилизация),
// эффекты и экспорт. Кросс-системные операции — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuForAnchor, toast, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { longPress } from '../core/long-press.js';
import { saveBrushPrefs } from '../core/brush-prefs.js';
import { ensureSymmetryDefaults } from '../core/layers.js';
import { ICONS, BRUSH_MODES, LINE_MODES, SHAPE_MODES, SYM_MODES, SYM_TOOLS, FLIP_MODES, CENTER_MODES, ZOOM_MODES } from '../config/toolbar.js';

const TOOLS = ['pencil', 'eraser', 'fill', 'select', 'lasso', 'move', 'adjust'];
let lastBrushMode = 'normal';
let lastShapeMode = { kind: 'shape', tool: 'rect', fill: false };
let lastSymChoice = { kind: 'flag', flag: 'sym' };
let lastFlipMode = 'h';
let lastCenterMode = 'center';
let lastZoomMode = 'fit';

function setButtonIcon(btn, mode) {
  if (!btn || !mode) return;
  btn.innerHTML = ICONS[mode.icon];
  btn.dataset.i18nTitle = mode.key;
  btn.title = t(mode.key);
}

function brushModeCfg(mode = lastBrushMode) { return BRUSH_MODES.find((m) => m.mode === mode) || BRUSH_MODES[0]; }
function currentBrushMode() { return brushModeCfg(S.tool === 'pencil' && S.shading && (S.shading.on || S.shading.picking) ? 'shading' : lastBrushMode); }
function shapeModeCfg(mode = lastShapeMode) {
  if (mode.kind === 'line') return LINE_MODES.find((m) => m.mode === mode.mode) || LINE_MODES[0];
  const tool = mode.tool || 'rect', fill = !!mode.fill;
  return SHAPE_MODES.find((m) => m.tool === tool && m.fill === fill) || SHAPE_MODES[0]; }
function currentShapeMode() { return shapeModeCfg(lastShapeMode); }
function currentSymMode() {
  return lastSymChoice.kind === 'tool'
    ? (SYM_TOOLS.find((m) => m.mode === lastSymChoice.mode) || { icon: 'symV', key: 'side.symmetry' })
    : (SYM_MODES.find((m) => m.flag === lastSymChoice.flag) || { icon: 'symV', key: 'side.symmetry' }); }
function currentFlipMode() { return FLIP_MODES.find((m) => m.mode === lastFlipMode) || FLIP_MODES[0]; }
function currentCenterMode() { return CENTER_MODES.find((m) => m.mode === lastCenterMode) || CENTER_MODES[0]; }
function currentZoomMode() { return ZOOM_MODES.find((m) => m.mode === lastZoomMode) || ZOOM_MODES[0]; }

function syncChoiceMenus() {
  const brush = $('brush-choice'); if (brush) for (const b of brush.querySelectorAll('button')) b.classList.toggle('on', b.dataset.brushMode === lastBrushMode);
  const shape = $('shape-choice'); if (shape) for (const b of shape.querySelectorAll('button')) {
    if (b.dataset.lineMode) b.classList.toggle('on', lastShapeMode.kind === 'line' && b.dataset.lineMode === lastShapeMode.mode);
    if (b.dataset.shapeTool) b.classList.toggle('on', lastShapeMode.kind === 'shape' && b.dataset.shapeTool === lastShapeMode.tool && (b.dataset.fill === '1') === !!lastShapeMode.fill);
  }
  const sym = $('sym-choice'); if (sym) for (const b of sym.querySelectorAll('button')) {
    if (b.dataset.symFlag) b.classList.toggle('on', !!S[b.dataset.symFlag]);
    if (b.dataset.symTool) b.classList.toggle('on', (S.symLines && S.symLines.mode) === b.dataset.symTool);
  }
  const flip = $('flip-choice'); if (flip) for (const b of flip.querySelectorAll('button')) b.classList.toggle('on', b.dataset.flipMode === lastFlipMode);
  const center = $('center-choice'); if (center) for (const b of center.querySelectorAll('button')) b.classList.toggle('on', b.dataset.centerMode === lastCenterMode);
  const zoom = $('zoom-choice'); if (zoom) for (const b of zoom.querySelectorAll('button')) b.classList.toggle('on', b.dataset.zoomMode === lastZoomMode);
}

function syncModeButtons() {
  setButtonIcon($('t-pencil'), currentBrushMode());
  setButtonIcon($('t-shape'), currentShapeMode());
  setButtonIcon($('sym'), currentSymMode());
  setButtonIcon($('flip-h'), currentFlipMode());
  setButtonIcon($('center'), currentCenterMode());
  setButtonIcon($('zoom'), currentZoomMode());
  const sym = $('sym'); if (sym) sym.classList.toggle('on', isSymmetryModeActive());
  syncChoiceMenus();
}

function choiceButton(icon, key) {
  const b = document.createElement('button');
  b.innerHTML = ICONS[icon]; b.title = t(key); b.dataset.i18nTitle = key;
  return b;
}

function buildToolChoices() {
  const brush = $('brush-choice');
  if (brush && !brush.dataset.ready) { brush.dataset.ready = '1';
    for (const m of BRUSH_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.brushMode = m.mode;
      b.onclick = () => { brush.classList.remove('on'); activateBrushMode(m.mode, true); };
      brush.appendChild(b); } }
  const shape = $('shape-choice');
  if (shape && !shape.dataset.ready) { shape.dataset.ready = '1';
    for (const m of LINE_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.lineMode = m.mode;
      b.onclick = () => { shape.classList.remove('on'); activateShapeMode({ kind: 'line', mode: m.mode }); };
      shape.appendChild(b); }
    for (const m of SHAPE_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.shapeTool = m.tool; b.dataset.fill = m.fill ? '1' : '0';
      b.onclick = () => { shape.classList.remove('on'); activateShapeMode({ kind: 'shape', tool: m.tool, fill: m.fill }); };
      shape.appendChild(b); } }
  const sym = $('sym-choice');
  if (sym && !sym.dataset.ready) { sym.dataset.ready = '1';
    for (const m of SYM_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.symFlag = m.flag;
      b.onclick = () => { lastSymChoice = { kind: 'flag', flag: m.flag }; toggleSym(m.flag); };
      sym.appendChild(b); } }
  if (sym && !sym.dataset.toolsReady) { sym.dataset.toolsReady = '1';
    for (const m of SYM_TOOLS) { const b = choiceButton(m.icon, m.key); b.dataset.symTool = m.mode;
      b.onclick = () => { activateSymTool(m.mode); };
      sym.appendChild(b); } }
  const flip = $('flip-choice');
  if (flip && !flip.dataset.ready) { flip.dataset.ready = '1';
    for (const m of FLIP_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.flipMode = m.mode;
      b.onclick = () => { lastFlipMode = m.mode; syncModeButtons(); actions.run(m.action); };
      flip.appendChild(b); } }
  const center = $('center-choice');
  if (center && !center.dataset.ready) { center.dataset.ready = '1';
    for (const m of CENTER_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.centerMode = m.mode;
      b.onclick = () => { lastCenterMode = m.mode; syncModeButtons(); actions.run(m.action); };
      center.appendChild(b); } }
  const zoom = $('zoom-choice');
  if (zoom && !zoom.dataset.ready) { zoom.dataset.ready = '1';
    for (const m of ZOOM_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.zoomMode = m.mode;
      b.onclick = () => { lastZoomMode = m.mode; syncModeButtons(); actions.run(m.action); };
      zoom.appendChild(b); } }
}

function showToolChoice(menuId, anchor) {
  syncModeButtons(); showMenuForAnchor($(menuId), anchor);
}

function activateBrushMode(mode = lastBrushMode, configure = false) {
  lastBrushMode = mode;
  setTool('pencil');
  if (mode === 'shading') {
    if (configure) {
      actions.run('shading.open');
      if (!S.shading || !S.shading.colors || S.shading.colors.length < 2) actions.run('shading.pickColors');
    } else if (!actions.run('shading.enable')) { lastBrushMode = 'normal'; actions.run('shading.disable'); }
  } else actions.run('shading.disable');
  syncModeButtons();
}

function activateShapeMode(mode = lastShapeMode) {
  lastShapeMode = { ...mode };
  if (mode.kind === 'line') { S.lineMode = mode.mode; setTool('line'); }
  else { S.shapeTool = mode.tool; S.fillShape[mode.tool] = !!mode.fill; setTool(mode.tool); }
  syncModeButtons();
}

function activateSymTool(mode) {
  lastSymChoice = { kind: 'tool', mode };
  S.symEnabled = true;
  S.symLines ||= { x: null, y: null, d1: null, d2: null, mode: null, hover: null };
  S.symLines.mode = S.symLines.mode === mode ? null : mode; S.symLines.hover = null; syncModeButtons(); bus.emit('render');
}

const hasSymmetryAxes = () => !!(S.sym || S.symH || S.symD1 || S.symD2);
const isSymmetryModeActive = () => S.symEnabled !== false && !!(hasSymmetryAxes() || (S.symLines && S.symLines.mode));
const shapeToolActive = () => S.tool === 'line' || S.tool === 'rect' || S.tool === 'ellipse';

function suspendSymmetryMode() {
  S.symEnabled = false;
  if (S.symLines) { S.symLines.mode = null; S.symLines.hover = null; }
  syncModeButtons(); bus.emit('render'); bus.emit('layers');
}

function activateLastSymChoice() {
  if (isSymmetryModeActive()) { suspendSymmetryMode(); return; }
  S.symEnabled = true;
  if (hasSymmetryAxes()) { syncModeButtons(); bus.emit('render'); bus.emit('layers'); return; }
  if (lastSymChoice.kind === 'tool') activateSymTool(lastSymChoice.mode);
  else toggleSym(lastSymChoice.flag);
}

function syncToolButtons() {
  if (S.tool === 'line') lastShapeMode = { kind: 'line', mode: S.lineMode || 'line' };
  else if (S.tool === 'rect' || S.tool === 'ellipse') lastShapeMode = { kind: 'shape', tool: S.tool, fill: !!S.fillShape[S.tool] };
  for (const id of TOOLS) { const b = $('t-' + id); if (b) b.classList.toggle('on', S.tool === id); }
  const shapeOn = shapeToolActive();
  const shapeBtn = $('t-shape'); if (shapeBtn) shapeBtn.classList.toggle('on', shapeOn);
  $('t-select').classList.toggle('on', !S.rotMode && (S.tool === 'select' || !!S.sel));
  $('t-move').classList.toggle('on', !!S.rotMode);
  syncModeButtons();
  $('cv').style.cursor = S.tool === 'move' ? 'move' : ''; // пипетка (bb-pick «on», body.picking) — на Eyedropper System
}

// кнопки флагов кисти (Pixel Perfect / стабилизация) — синхрон с состоянием
function syncBrushFlags() { $('pp').classList.toggle('on', S.ppOn); $('stab').classList.toggle('on', S.stabOn); }
function toggle(flag, btnId, onKey, offKey, save = false) { S[flag] = !S[flag]; if (save) saveBrushPrefs(S);
  $(btnId).classList.toggle('on', S[flag]); bus.emit('render'); toast(t(S[flag] ? onKey : offKey)); }
function toggleSym(flag) { const m = SYM_MODES.find((x) => x.flag === flag); if (!m) return;
  ensureSymmetryDefaults();
  S.symEnabled = true;
  S[flag] = !S[flag]; syncModeButtons(); bus.emit('render'); bus.emit('layers'); toast(t(S[flag] ? m.onKey : m.offKey)); }
const activateDefaultBrush = () => activateBrushMode('normal');
const selOff = () => { if (S.sel) actions.run('select.none'); activateDefaultBrush(); };
const brushClick = (tool) => {
  if (tool === 'pencil') activateBrushMode(lastBrushMode);
  else if (S.tool === tool) activateDefaultBrush();
  else { actions.run('shading.disable'); setTool(tool); }
};
const moveClick = () => { if (S.rotMode) { actions.run('transform.apply'); activateDefaultBrush(); } else actions.run('transform.enter'); };

export function mount() {
  buildToolChoices();
  $('t-pencil').onclick = () => brushClick('pencil');
  $('t-eraser').onclick = () => brushClick('eraser');
  longPress($('t-pencil'), () => actions.run('ui.brushLibrary', 'pencil')); // ПКМ/долгое нажатие — галерея кистей
  longPress($('t-eraser'), () => actions.run('ui.brushLibrary', 'eraser'));
  $('t-shape').onclick = () => (shapeToolActive() ? activateDefaultBrush() : activateShapeMode());
  $('t-shape').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('shape-choice', e.currentTarget); });
  $('t-move').onclick = moveClick; // повторное нажатие — применить и выключить
  $('t-select').onclick = () => ((S.tool === 'select' || S.sel) ? selOff() : setTool('select'));
  $('t-lasso').onclick = () => (S.tool === 'lasso' ? selOff() : setTool('lasso'));
  $('t-fill').onclick = () => (S.tool === 'fill' ? activateDefaultBrush() : actions.run('tool.fill'));
  $('t-adjust').onclick = () => (S.tool === 'adjust' ? activateDefaultBrush() : setTool('adjust'));
  $('t-adjust').addEventListener('contextmenu', (e) => { e.preventDefault(); setTool('adjust'); $('adjpop').classList.add('on'); });

  $('sym').onclick = activateLastSymChoice;
  $('sym').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('sym-choice', e.currentTarget); });
  $('pp').onclick = () => toggle('ppOn', 'pp', 'toast.ppOn', 'toast.ppOff', true);
  $('stab').onclick = () => toggle('stabOn', 'stab', 'toast.stabOn', 'toast.stabOff', true);

  $('flip-h').onclick = () => { const m = currentFlipMode(); actions.run(m.action); };
  $('flip-h').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('flip-choice', e.currentTarget); });
  $('img-settings').onclick = () => actions.run('effect.bc', null, null, { scope: S.bgSel ? 'canvas' : 'layer' }); // фон → весь документ, слой/папка → к выбранному
  $('center').onclick = () => { const m = currentCenterMode(); actions.run(m.action); };
  $('center').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('center-choice', e.currentTarget); });

  $('zoom').onclick = () => { const m = currentZoomMode(); actions.run(m.action); };
  $('zoom').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('zoom-choice', e.currentTarget); });

  syncBrushFlags(); syncModeButtons();
  bus.on('tool', syncToolButtons); bus.on('selection', syncToolButtons); bus.on('shading', syncToolButtons);
  bus.on('brush-flags', syncBrushFlags); syncToolButtons();
}

actions.register('toggle.symV', () => { lastSymChoice = { kind: 'flag', flag: 'sym' }; toggleSym('sym'); });
actions.register('toggle.symH', () => { lastSymChoice = { kind: 'flag', flag: 'symH' }; toggleSym('symH'); });
actions.register('toggle.pixelPerfect', () => $('pp').click());
actions.register('toggle.stabilize', () => $('stab').click());
