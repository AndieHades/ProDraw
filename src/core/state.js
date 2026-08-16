// Слой данных: единственный изменяемый объект состояния документа.
// Системы общаются с ним только через этот модуль — прямых связей между
// системами нет. Поля менять как S.W = …, не реэкспортируя биндинги.
// Настраиваемые значения берутся из src/config (а не зашиты тут).
import { MAX_LAYERS, MAX_SIZE, BP_SMAX } from '../config/limits.js';
import { DEFAULT_DOC } from '../config/presets.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../config/palette.js';
import { BRUSH_DEFAULTS, FLAGS_DEFAULT, ADJUST_DEFAULT, EFFECT_DEFAULTS } from '../config/defaults.js';
import { LASSO_DEFAULT } from '../config/lasso.js';
import { BRUSH_RESIZE } from '../config/brush-resize.js';
import { EYEDROPPER } from '../config/eyedropper.js';
import { CURSOR } from '../config/cursor.js';
import { loadBrushPrefs } from './brush-prefs.js';
import { cloneGrid, blank } from '../logic/raster.js';
import { cloneTilemap } from '../logic/tilemap-data.js';
import { cloneTextSource } from '../logic/text-model.js';
import { TILE_FLAGS_DEFAULT, TILE_GRID_DEFAULT, TILE_GRID_SIZES } from '../config/tileset.js';
import { defaultReferenceBoard } from './reference-board.js';
import { t } from '../i18n/index.js';
export { MAX_LAYERS, MAX_SIZE, BP_SMAX };

// последний выбранный размер Tileset Grid — персистится (не сбрасывается на 16)
const loadTileGrid = () => { try { const n = +localStorage.getItem('pxh.tileGrid'); return TILE_GRID_SIZES.includes(n) ? n : TILE_GRID_DEFAULT; } catch (e) { return TILE_GRID_DEFAULT; } };
export { blank };

export const newLayer = (name, w, h) => ({ name, grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [], kind: 'pixel' });
// глубокая копия слоя (история/галерея/дубликат); overrides перекрывают поля
// (напр. дубликат: reference:false и новое имя). Все поля слоя — в одном месте.
export const cloneLayer = (L, overrides = {}) => ({
  name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid,
  clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, reference: !!L.reference, symLock: !!L.symLock,
  ext: new Map(L.ext), grid: cloneGrid(L.grid), effects: cloneFx(L.effects),
  kind: L.kind || 'pixel', text: L.text ? cloneTextSource(L.text) : undefined,
  tilemap: L.tilemap ? cloneTilemap(L.tilemap) : undefined,
  tilemapSettings: L.tilemapSettings ? { ...L.tilemapSettings } : undefined, ...overrides,
});

// фабрика эффекта слоя/папки: уникальный id, видимость, копия дефолтных параметров
let fxSeq = 0;
export const newEffect = (type, params = {}) => ({ id: ++fxSeq, type, visible: true, params: { ...EFFECT_DEFAULTS[type], ...params } });
// глубокая копия списка эффектов (только данные — для истории/сериализации/копипаста)
export const cloneFx = (list) => (list || []).map((e) => ({ id: ++fxSeq, type: e.type, visible: e.visible !== false, opacity: e.opacity ?? 1, params: { ...e.params } }));

const pal0 = defaultPalette();
const brushPrefs = loadBrushPrefs(BRUSH_DEFAULTS(), FLAGS_DEFAULT);
// единый контейнер изменяемого состояния
export const S = {
  W: DEFAULT_DOC.w, H: DEFAULT_DOC.h, layerSeq: 1, docName: '',
  layers: [newLayer(t('layer.name') + ' 1', DEFAULT_DOC.w, DEFAULT_DOC.h)], cur: 0,
  bg: { color: null, visible: true }, bgSel: false, // фон-слой Background: цвет (null=прозрачный) и видимость; bgSel — выбран ли он
  folders: [], folderSeq: 0, marked: new Set(), selFolder: null, markedFolders: new Set(),
  fxSel: new Set(), fxCur: null, fxDraft: null, // выделенные строки эффектов + черновик окна

  palette: pal0, active: pal0[DEFAULT_ACTIVE].slice(),
  colorMode: 'rgba',
  shading: { colors: [], on: false, open: false, picking: false }, // palette ramp + Aseprite-like shading brush mode
  tool: 'pencil', sym: false, symH: false, symD1: false, symD2: false, symEnabled: true,
  xMirror: false, // зажатый X — временное горизонтальное зеркало кисти во время рисования
  symLines: { x: null, y: null, d1: null, d2: null, mode: null, hover: null },
  grid: { w: 16, h: 16, color: '#4aa3ff', opacity: 70, visible: false, preview: false, link: true },
  tile: { on: false }, // Tile Mode: бесшовный 3×3-повтор холста с заворотом рисования (как в Aseprite)
  // Tileset/Tilemap: библиотека тайлов, активный тайл/группа для Tile Brush,
  // transform-флаги новых экземпляров, выделение клеток, редактор source tile.
  tilesets: [], tilesetSeq: 0,
  tileset: { on: false, open: false }, // активный Tilemap-слой показывает Tileset-панель и сетку клеток
  tilesetPrev: null, // сохранённое состояние кисти/стабилизации на время работы с Tilemap
  tileGrid: { size: loadTileGrid() }, // размер квадрата Tileset Grid (отдельно от обычной сетки Grid)
  activeTile: null, // { tilesetId, tileId } или { tilesetId, groupId }
  placeTile: null, // последний явно выбранный тайл/группа для Place tile
  tileMarks: new Set(), // мульти-выбор тайлов в палитре (как свотчи)
  tilePattern: null, // паттерн из нескольких выбранных тайлов (Godot-стиль): { w, h, ids }
  tileRandom: false, // Random: рисовать случайными тайлами из выбранных (кубик)
  tileRandomNext: null, // зафиксированный следующий случайный tileId (превью == то, что ляжет)
  tileMode: 'paint', // режим Tile Brush: paint | erase | pick
  tileAutoMode: 'auto', // Draw on Tile (auto) | Edit All Tiles (manual)
  tileFlags: { ...TILE_FLAGS_DEFAULT },
  tileSel: null, // { li, x0, y0, x1, y1 } — прямоугольное выделение клеток
  tileEdit: null, // состояние открытого редактора source tile
  lineMode: 'line', shapeTool: 'rect',
  fillShape: { rect: false, ellipse: false }, // режимы общей кнопки фигур: контур/заливка
  brushes: brushPrefs.brushes, stampBrush: { pencil: null, eraser: null }, // активная кисть-штамп по инструменту (null = квадрат)
  ppOn: brushPrefs.flags.pixelPerfect, stabOn: brushPrefs.flags.stabilize, stroke: false,
  adjMode: ADJUST_DEFAULT.mode, adjAmt: ADJUST_DEFAULT.amount,
  sel: null, selMask: null, selFloat: null,
  lassoMode: LASSO_DEFAULT.mode, lassoOp: LASSO_DEFAULT.op, lassoPath: null,
  cursorMode: CURSOR.mode, // Cursor Preview Mode: real | circle | hybrid
  brushResize: { ...BRUSH_RESIZE, capturing: false }, // жест Brush Size Modifier (настройки + захват клавиши)
  eyedrop: { ...EYEDROPPER, capturing: false }, // Eyedropper System (Hot Key + захват клавиши)
  referenceBoard: defaultReferenceBoard(),
  view: { zoom: 12, ox: 0, oy: 0 },
  undoStack: [], redoStack: [],
  // общая интерактивная/превью-стейт, которую читает рендер и пишут системы
  // (system-private мелочь вроде ppPath/strokeSeen живёт внутри своих систем)
  qsShape: null, // QuickShape: распознанная ровная форма для превью/коммита
  cropMode: null, rotMode: null, rotPrev: null, rotQuad: null, moveDrag: null,
  hoverPx: null, lineStart: null, linePrev: null, linePath: null,
  replaceMode: null,
};

// активная сетка текущего слоя
export const G = () => S.layers[S.cur].grid;
