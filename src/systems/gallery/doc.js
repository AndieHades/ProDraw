// Персистентность активной работы: снимок S → запись, восстановление, новая
// работа (в т.ч. из картинки), автосохранение.
import { S, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { dirtyAll } from '../../core/layer-cache.js';
import { defaultReferenceBoard, normalizeReferenceBoard } from '../../core/reference-board.js';
import { dedupePal } from '../../logic/quantize.js';
import { defaultPalette, grayscalePalette, DEFAULT_ACTIVE } from '../../config/palette.js';
import { saveDoc, getDoc } from '../../core/storage.js';
import { ensureGrid } from '../../core/grid.js';
import { cloneAnimator, loadFrame } from '../../core/animation.js';
import { t } from '../../i18n/index.ts';
import { DEFAULT_CANVAS_BACKGROUND } from '../../config/canvas-background.ts';
import { AUTOSAVE_DELAY_MS, AUTOSAVE_IDLE_TIMEOUT_MS,
  AUTOSAVE_STROKE_RETRY_MS } from '../../config/timings.ts';
import { LegacyAutosaveController } from './LegacyAutosaveController.ts';
import { buildGalleryRecord } from './record.js';
import { uid } from './store.js';
import { retireTilemapRecord } from '../../logic/retiredTilemap.ts';

let curId = null, curFolder = null, workChange = 0, mutation = 0, saved = null;
let persistChain = Promise.resolve(false);
export const curWorkId = () => curId;
const nextWorkChange = () => ++workChange;
const invalidateSaved = () => { mutation++; saved = null; };
const markSaved = (id, version) => { if (id === curId && version === mutation) saved = { id, version }; };
const isSaved = () => saved?.id === curId && saved.version === mutation;

async function persist(id, folder, isCurrent) {
  if (!id || !isCurrent()) return false;
  const current = () => isCurrent() && id === curId;
  const rec = await buildGalleryRecord(id, folder, current);
  if (!rec || !current()) return false;
  const old = await getDoc(id); if (!current()) return false;
  if (old) { rec.folder = old.folder ?? null; rec.order = old.order ?? rec.order; }
  await saveDoc(rec); return true; }
function queuePersist(isCurrent) { const id = curId, folder = curFolder;
  const run = () => persist(id, folder, isCurrent);
  persistChain = persistChain.catch(() => false).then(run); return persistChain; }
const autosaveController = new LegacyAutosaveController({
  delayMs: AUTOSAVE_DELAY_MS, retryMs: AUTOSAVE_STROKE_RETRY_MS,
  idleTimeoutMs: AUTOSAVE_IDLE_TIMEOUT_MS, isInputActive: () => S.stroke,
  save: async (isCurrent) => { const id = curId, version = mutation;
    if (await queuePersist(() => isCurrent() && id === curId && version === mutation)) markSaved(id, version); },
});
export async function saveCurrent() { if (!curId || isSaved()) return true;
  if (S.stroke) { autosaveController.request(); return false; }
  autosaveController.supersede(); const id = curId, version = mutation;
  try { const ok = await queuePersist(() => !S.stroke && id === curId && version === mutation);
    if (ok) markSaved(id, version); return ok; } catch (error) { return false; } }
export const autosave = () => { invalidateSaved(); autosaveController.request(); };
export const autosaveInputStarted = () => autosaveController.inputStarted();

function applyRec(rec) { retireTilemapRecord(rec);
  S.W = rec.W; S.H = rec.H; S.layerSeq = rec.layerSeq || 1;
  S.layers = rec.layers; S.folders = rec.folders || [];
  S.layers.forEach((L) => { if (!L.effects) L.effects = []; L.reference = !!L.reference; if (!L.kind) L.kind = 'pixel'; }); S.folders.forEach((f) => { if (!f.effects) f.effects = []; }); // старые проекты без эффектов/reference/kind
  // folderSeq всегда впереди реальных id — иначе новые папки могут получить чужой id (старые проекты)
  S.folderSeq = S.folders.reduce((m, f) => Math.max(m, f.id), rec.folderSeq || 0); S.palette = dedupePal(rec.palette); S.active = (rec.active || S.palette[0]).slice();
  S.bg = rec.bg ? { color: rec.bg.color ? rec.bg.color.slice() : null, visible: rec.bg.visible !== false } : { color: null, visible: true }; S.bgSel = false;
  S.grid = rec.grid ? { ...rec.grid } : {}; ensureGrid();
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.referenceBoard = normalizeReferenceBoard(rec.referenceBoard);
  S.animator = rec.animator ? cloneAnimator(rec.animator) : null;
  S.docName = rec.name; S.colorMode = rec.colorMode || 'rgba'; S.cur = 0; S.marked.clear(); S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null;
  if (S.animator) loadFrame(S.animator.liveFrameId || S.animator.timelines[0].selectedFrameId, { emit: false });
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('selection'); bus.emit('grid'); bus.emit('fit'); bus.emit('reference'); }

function blankWork(w, h, name, colorMode = 'rgba') { nextWorkChange(); curId = uid('d'); curFolder = null;
  S.W = w; S.H = h; S.layerSeq = 1; S.folderSeq = 0; S.layers = [newLayer(t('layer.name') + ' 1', w, h)]; S.folders = []; S.cur = 0; S.marked.clear();
  S.colorMode = colorMode; S.palette = colorMode === 'grayscale' ? grayscalePalette() : defaultPalette();
  S.active = colorMode === 'grayscale' ? S.palette[S.palette.length - 1].slice() : S.palette[DEFAULT_ACTIVE].slice(); S.docName = name || t('gallery.untitled');
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.grid = {}; ensureGrid();
  S.referenceBoard = defaultReferenceBoard(); bus.emit('reference');
  S.bg = { color: null, visible: true }; S.bgSel = false;
  S.animator = null;
  S.undoStack.length = 0; S.redoStack.length = 0; S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null; }

function activateNewWork(w, h, name, bg, colorMode) { blankWork(w, h, name, colorMode);
  S.bg = { color: bg ? bg.slice(0, 3) : null, visible: true }; // выбранный при создании цвет → фон-слой Background (не пиксели слоя)
  dirtyAll({ preserveGridBounds: true }); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); }

export function newWork(w, h, name, bg = DEFAULT_CANVAS_BACKGROUND.color, colorMode = 'rgba') {
  activateNewWork(w, h, name, bg, colorMode); saveCurrent(); }

async function restoreWork(id, expectedChange) { if (expectedChange !== workChange) return;
  nextWorkChange();
  if (!id) { curId = null; curFolder = null; saved = null; return; }
  try { const rec = await getDoc(id); if (!rec || rec.kind === 'folder') return;
    curId = id; curFolder = rec.folder ?? null; applyRec(rec);
    autosaveController.supersede(); markSaved(curId, mutation); } catch (error) {} }

export async function createNewWork(w, h, name, bg = DEFAULT_CANVAS_BACKGROUND.color, colorMode = 'rgba') {
  const sourceId = curId, change = nextWorkChange();
  if (!await saveCurrent() || change !== workChange) return false;
  activateNewWork(w, h, name, bg, colorMode); const created = workChange;
  if (await saveCurrent() && created === workChange) return true;
  await restoreWork(sourceId, created); return false;
}

export function newWorkFromImage(w, h, data, name) { blankWork(w, h, name);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (data[o + 3] < 8) continue; S.layers[0].grid[y][x] = [data[o], data[o + 1], data[o + 2], data[o + 3]]; }
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

export function newWorkFromLayers(w, h, layers, name) { blankWork(w, h, name);
  S.layers = layers.map((L, i) => ({ name: L.name || (t('layer.name') + ' ' + (i + 1)), grid: L.grid, opacity: 1, visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] }));
  if (!S.layers.length) S.layers = [newLayer(t('layer.name') + ' 1', w, h)];
  S.cur = S.layers.length - 1;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

// заготовка нового документа под результат конвертера (applyImport заполнит S)
export function beginConvertedWork() { nextWorkChange(); curId = uid('d'); curFolder = null; S.docName = t('gallery.untitled'); }

export async function openWork(id) { const change = nextWorkChange();
  if (id === curId) return await saveCurrent() && change === workChange;
  if (!await saveCurrent() || change !== workChange) return false;
  const rec = await getDoc(id); if (change !== workChange || !rec || rec.kind === 'folder') return false;
  curId = id; curFolder = rec.folder ?? null; applyRec(rec);
  autosaveController.supersede(); markSaved(curId, mutation); return true; }
