// Слой данных: единственный изменяемый объект состояния документа.
// Системы общаются с ним только через этот модуль — прямых связей между
// системами нет. Поля менять как S.W = …, не реэкспортируя биндинги.
// Настраиваемые значения берутся из src/config (а не зашиты тут).
import { MAX_LAYERS, MAX_SIZE } from "../config/limits.ts";
import { DEFAULT_DOC } from "../config/presets.ts";
import { defaultPalette, DEFAULT_ACTIVE } from "../config/palette.ts";
import { PENCIL_DEFAULT_SIZE, ERASER_DEFAULT_SIZE,
  ADJUST_DEFAULT } from "../config/defaults.ts";
import { LASSO_DEFAULT } from "../config/lasso.ts";
import { EYEDROPPER } from "../config/eyedropper.ts";
import { DEFAULT_CANVAS_BACKGROUND } from "../config/canvas-background.ts";
import { loadActiveColor } from "./color-prefs.ts";
import { blank } from "../logic/raster.ts";
import type { LayerRecord } from "./layer-record.ts";
import { newLayer } from "./layer-record.ts";
import { createLegacyLayerCollection } from "./raster/legacyRasterOwner.ts";
import { defaultReferenceBoard } from "./reference-board.ts";
import { t } from "../i18n/index.ts";

export { MAX_LAYERS, MAX_SIZE, blank };
export type { LayerEffect, LayerRecord } from "./layer-record.ts";
export { cloneFx, cloneLayer, cloneLayerRecord, newEffect, newLayer,
  newLayerRecord } from "./layer-record.ts";

export interface EditorState {
  W: number; H: number; dpi: number; layerSeq: number; docName: string;
  layers: LayerRecord[]; cur: number;
  bg: { color: number[] | null; visible: boolean }; bgSel: boolean;
  folders: Record<string, unknown>[]; folderSeq: number;
  marked: Set<number>; selFolder: number | null; markedFolders: Set<number>;
  fxSel: Set<unknown>; fxCur: unknown; fxDraft: unknown;
  palette: number[][]; active: number[]; colorMode: string;
  [key: string]: unknown;
}

const pal0 = defaultPalette();
const active0 = loadActiveColor(pal0[DEFAULT_ACTIVE] ?? [12, 12, 16]);
// единый контейнер изменяемого состояния
export const S: EditorState = {
  W: DEFAULT_DOC.w, H: DEFAULT_DOC.h, dpi: 72, layerSeq: 1, docName: "",
  layers: [newLayer(t("layer.name") + " 1", DEFAULT_DOC.w, DEFAULT_DOC.h)], cur: 0,
  bg: { color: [...DEFAULT_CANVAS_BACKGROUND.color],
    visible: DEFAULT_CANVAS_BACKGROUND.visible }, bgSel: false,
  folders: [], folderSeq: 0, marked: new Set(), selFolder: null,
  markedFolders: new Set(),
  // выделенные строки эффектов + черновик окна
  fxSel: new Set(), fxCur: null, fxDraft: null,

  palette: pal0 as unknown as number[][], active: active0 as unknown as number[],
  colorMode: "rgba",
  tool: "pencil", sym: false, symH: false, symD1: false, symD2: false,
  symEnabled: true,
  // зажатый X — временное горизонтальное зеркало кисти во время рисования
  xMirror: false,
  symLines: { x: null, y: null, d1: null, d2: null, mode: null, hover: null },
  grid: { w: 16, h: 16, color: "#4aa3ff", opacity: 70, visible: false,
    preview: false, link: true },
  // Tile Mode: бесшовный 3×3-повтор холста с заворотом рисования
  tile: { on: false },
  lineMode: "line", shapeTool: "rect",
  // режимы общей кнопки фигур: контур/заливка
  fillShape: { rect: false, ellipse: false },
  pencilSize: PENCIL_DEFAULT_SIZE, eraserSize: ERASER_DEFAULT_SIZE,
  brushOpacity: { pencil: 1, eraser: 1 },
  brushShape: { pencil: "round", eraser: "round" }, stroke: false,
  adjMode: ADJUST_DEFAULT.mode, adjAmt: ADJUST_DEFAULT.amount,
  sel: null, selMask: null, selFloat: null,
  lassoMode: LASSO_DEFAULT.mode, lassoOp: LASSO_DEFAULT.op, lassoPath: null,
  // Eyedropper System (Hot Key + захват клавиши)
  eyedrop: { ...EYEDROPPER, capturing: false },
  referenceBoard: defaultReferenceBoard(),
  psdWarnings: [], sourceFormat: null, sourceLocation: null,
  view: { zoom: 12, ox: 0, oy: 0 },
  undoStack: [], redoStack: [],
  // общая интерактивная/превью-стейт, которую читает рендер и пишут системы
  // (system-private мелочь вроде ppPath/strokeSeen живёт внутри своих систем)
  qsShape: null, // QuickShape: распознанная ровная форма для превью/коммита
  cropMode: null, rotMode: null, rotPrev: null, rotQuad: null, moveDrag: null,
  hoverPx: null,
  lineStart: null, linePrev: null, linePath: null,
  replaceMode: null,
};

let liveLayers = createLegacyLayerCollection(S.layers,
  () => ({ width: S.W, height: S.H }));
Object.defineProperty(S, "layers", { enumerable: true, configurable: false,
  get: () => liveLayers,
  set: (value: LayerRecord[]) => { liveLayers = createLegacyLayerCollection(
    value || [], () => ({ width: S.W, height: S.H })); } });

export const activeColorSnapshot = (): number[] => S.active.slice(0, 3);

// активная сетка текущего слоя
export const G = (): unknown => S.layers[S.cur]?.grid;
