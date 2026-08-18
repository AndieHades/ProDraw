// Слой данных: единственный изменяемый объект состояния документа.
// Системы общаются с ним только через этот модуль — прямых связей между
// системами нет. Поля менять как S.W = …, не реэкспортируя биндинги.
// Настраиваемые значения берутся из src/config (а не зашиты тут).
import { MAX_LAYERS, MAX_SIZE, BP_SMAX } from '../config/limits.ts';
import { DEFAULT_DOC } from '../config/presets.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../config/palette.js';
import { BRUSH_DEFAULTS, FLAGS_DEFAULT, ADJUST_DEFAULT, EFFECT_DEFAULTS } from '../config/defaults.ts';
import { LASSO_DEFAULT } from '../config/lasso.ts';
import { BRUSH_RESIZE } from '../config/brush-resize.ts';
import { EYEDROPPER } from '../config/eyedropper.ts';
import { CURSOR } from '../config/cursor.ts';
import { DEFAULT_CANVAS_BACKGROUND } from '../config/canvas-background.ts';
import { loadBrushPrefs } from './brush-prefs.js';
import { loadActiveColor } from './color-prefs.ts';
import { cloneGrid, blank } from '../logic/raster.js';
import { cloneTextSource } from '../logic/text-model.js';
import { defaultReferenceBoard } from './reference-board.js';
import { t } from '../i18n/index.ts';
export { MAX_LAYERS, MAX_SIZE, BP_SMAX };

export { blank };

const clonePsdEffects = (effects = []) => effects.map((effect) => ({ ...effect,
  properties: structuredClone(effect.properties) }));
const cloneMasks = (masks = []) => masks.map((mask) => ({ ...mask,
  alpha: mask.alpha.slice() }));
export const newLayer = (name, w, h) => ({ name, grid: blank(w, h), opacity: 1,
  visible: true, fid: null, clip: false, lock: false, alphaLock: false,
  reference: false, ext: new Map(), effects: [], kind: 'pixel', blendMode: 'normal',
  masks: [], psdEffects: [] });
// глубокая копия слоя (история/галерея/дубликат); overrides перекрывают поля
// (напр. дубликат: reference:false и новое имя). Все поля слоя — в одном месте.
export const cloneLayer = (L, overrides = {}) => ({
  name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid,
  clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, reference: !!L.reference, symLock: !!L.symLock,
  ext: new Map([...(L.ext || [])].map(([key, cell]) =>
    [key, Array.isArray(cell) ? cell.slice() : cell])), grid: Object.prototype.hasOwnProperty.call(overrides, 'grid')
    ? overrides.grid : cloneGrid(L.grid), effects: cloneFx(L.effects),
  kind: L.kind || 'pixel', text: L.text ? cloneTextSource(L.text) : undefined,
  blendMode: L.blendMode || 'normal', masks: cloneMasks(L.masks),
  psdBounds: L.psdBounds ? { ...L.psdBounds } : undefined,
  psdEffects: clonePsdEffects(L.psdEffects),
  psdAdjustment: L.psdAdjustment ? structuredClone(L.psdAdjustment) : undefined,
  ...overrides,
});

// фабрика эффекта слоя/папки: уникальный id, видимость, копия дефолтных параметров
let fxSeq = 0;
export const newEffect = (type, params = {}) => ({ id: ++fxSeq, type, visible: true, params: { ...EFFECT_DEFAULTS[type], ...params } });
// глубокая копия списка эффектов (только данные — для истории/сериализации/копипаста)
export const cloneFx = (list) => (list || []).map((e) => ({ id: ++fxSeq, type: e.type, visible: e.visible !== false, opacity: e.opacity ?? 1, params: { ...e.params } }));

const pal0 = defaultPalette();
const active0 = loadActiveColor(pal0[DEFAULT_ACTIVE]);
const brushPrefs = loadBrushPrefs(BRUSH_DEFAULTS(), FLAGS_DEFAULT);
// единый контейнер изменяемого состояния
export const S = {
  W: DEFAULT_DOC.w, H: DEFAULT_DOC.h, dpi: 72, layerSeq: 1, docName: '',
  layers: [newLayer(t('layer.name') + ' 1', DEFAULT_DOC.w, DEFAULT_DOC.h)], cur: 0,
  bg: { color: [...DEFAULT_CANVAS_BACKGROUND.color],
    visible: DEFAULT_CANVAS_BACKGROUND.visible }, bgSel: false,
  folders: [], folderSeq: 0, marked: new Set(), selFolder: null, markedFolders: new Set(),
  fxSel: new Set(), fxCur: null, fxDraft: null, // выделенные строки эффектов + черновик окна

  palette: pal0, active: active0,
  colorMode: 'rgba',
  shading: { colors: [], on: false, open: false, picking: false }, // palette ramp + Aseprite-like shading brush mode
  tool: 'pencil', sym: false, symH: false, symD1: false, symD2: false, symEnabled: true,
  xMirror: false, // зажатый X — временное горизонтальное зеркало кисти во время рисования
  symLines: { x: null, y: null, d1: null, d2: null, mode: null, hover: null },
  grid: { w: 16, h: 16, color: '#4aa3ff', opacity: 70, visible: false, preview: false, link: true },
  tile: { on: false }, // Tile Mode: бесшовный 3×3-повтор холста с заворотом рисования (как в Aseprite)
  lineMode: 'line', shapeTool: 'rect',
  fillShape: { rect: false, ellipse: false }, // режимы общей кнопки фигур: контур/заливка
  brushes: brushPrefs.brushes, stampBrush: { pencil: null, eraser: null }, // активная кисть-штамп по инструменту (null = квадрат)
  ppOn: false, stabOn: false, stroke: false,
  adjMode: ADJUST_DEFAULT.mode, adjAmt: ADJUST_DEFAULT.amount,
  sel: null, selMask: null, selFloat: null,
  lassoMode: LASSO_DEFAULT.mode, lassoOp: LASSO_DEFAULT.op, lassoPath: null,
  cursorMode: CURSOR.mode, // прозрачный контур реального отпечатка
  brushResize: { ...BRUSH_RESIZE, capturing: false }, // жест Brush Size Modifier (настройки + захват клавиши)
  eyedrop: { ...EYEDROPPER, capturing: false }, // Eyedropper System (Hot Key + захват клавиши)
  referenceBoard: defaultReferenceBoard(),
  psdWarnings: [], sourceFormat: null,
  view: { zoom: 12, ox: 0, oy: 0 },
  undoStack: [], redoStack: [],
  // общая интерактивная/превью-стейт, которую читает рендер и пишут системы
  // (system-private мелочь вроде ppPath/strokeSeen живёт внутри своих систем)
  qsShape: null, // QuickShape: распознанная ровная форма для превью/коммита
  cropMode: null, rotMode: null, rotPrev: null, rotQuad: null, moveDrag: null,
  hoverPx: null, hoverInput: { pressure: 1, tiltX: 0, tiltY: 0, pointerType: 'mouse' },
  lineStart: null, linePrev: null, linePath: null,
  replaceMode: null,
};

// активная сетка текущего слоя
export const G = () => S.layers[S.cur].grid;
