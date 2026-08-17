// История: снимок всего документа (слои + размеры) и откат. Восстановление
// шлёт события 'layers'/'render' — история не знает про системы визуала.
import { S, cloneLayer } from './state.js';
import * as bus from './bus.ts';
import * as actions from './actions.ts';
import { toast, t } from './dom.js';
import { dirtyAll, markDirty } from './layer-cache.js';
import { historyCap } from '../config/limits.ts';
import { cloneGrid } from '../logic/raster.js';
import { cloneTileset } from '../logic/tileset-data.js';
import { historyRef, syncHistoryFrame } from './animation.js';
import { compactPixelEntry, createPixelBatch, createPixelPatch,
  recordPixel, swapPixelEntry } from './history/pixelPatch.js';
import { cloneEffects, createEffectsEntry } from './history/effectsPatch.js';
import { createDescriptorEntry } from './history/descriptorPatch.js';
import { createStructureEntry,
  inheritStructureIdentity } from './history/structurePatch.js';
import { createRasterReferenceEntry } from './history/rasterReferencePatch.js';
import { createCompoundEntry } from './history/compoundPatch.js';
import { createDocumentRemapEntry } from './history/documentRemapPatch.js';
import { isScopedEntry, swapScopedEntry } from './history/scopedPatch.js';

export { cloneGrid }; // канон — в logic/raster.js; реэкспорт для прежних импортов из истории

function snapState() {
  return { cur: S.cur, W: S.W, H: S.H, folderSeq: S.folderSeq,
    folders: S.folders.map((f) => inheritStructureIdentity(f,
      { ...f, effects: cloneEffects(f.effects) })),
    bg: { color: S.bg.color ? S.bg.color.slice() : null, visible: S.bg.visible !== false },
    animRef: historyRef(),
    tilesetSeq: S.tilesetSeq, tilesets: S.tilesets.map(cloneTileset),
    layers: S.layers.map((L) => inheritStructureIdentity(L,
      cloneLayer(L, { effects: cloneEffects(L.effects) }))) };
}

let pixelEdit = null;
const isPixelLayer = (layer) => !!layer && (!layer.kind || layer.kind === 'pixel');
function trimUndo() { const cap = historyCap(S.W * S.H);
  if (S.undoStack.length > cap) S.undoStack.splice(0, S.undoStack.length - cap); }

export function beginPixelPatch(layerIndex = S.cur) {
  if (pixelEdit) commitPixelPatch();
  if (!isPixelLayer(S.layers[layerIndex])) return false;
  pixelEdit = createPixelPatch(layerIndex, S.W, S.H); return true;
}
export function beginPixelBatch(indices) {
  if (pixelEdit) commitPixelPatch();
  const unique = [...new Set(indices || [])];
  if (!unique.length || unique.some((index) => !isPixelLayer(S.layers[index]))) return false;
  pixelEdit = createPixelBatch(unique, S.W, S.H); return true;
}
export const pixelPatchActive = () => !!pixelEdit;
export function recordPixelBefore(layerIndex, x, y, cell) {
  return recordPixel(pixelEdit, layerIndex, x, y, cell,
    S.layers[layerIndex]?.grid);
}
export function commitPixelPatch() { const edit = pixelEdit; pixelEdit = null;
  if (!edit) return false; const entry = compactPixelEntry(edit, S.layers);
  if (!entry) return false; S.undoStack.push(entry); trimUndo(); S.redoStack.length = 0;
  bus.emit('snapshot'); return true; }
export function cancelPixelPatch() { const edit = pixelEdit; pixelEdit = null;
  if (!edit) return false;
  return !!swapPixelEntry(edit, S.layers, S.W, S.H, markDirty); }

export function snapshotEffects(targets) { if (pixelEdit) commitPixelPatch();
  const entry = createEffectsEntry(targets, S); if (!entry) return false;
  S.undoStack.push(entry); trimUndo(); S.redoStack.length = 0;
  bus.emit('snapshot'); return true; }

export function snapshotDescriptors(descriptors) { if (pixelEdit) commitPixelPatch();
  const entry = createDescriptorEntry(descriptors, S); if (!entry) return false;
  S.undoStack.push(entry); trimUndo(); S.redoStack.length = 0;
  bus.emit('snapshot'); return true; }

export function snapshotStructure() { if (pixelEdit) commitPixelPatch();
  S.undoStack.push(createStructureEntry(S)); trimUndo(); S.redoStack.length = 0;
  bus.emit('snapshot'); return true; }

export function snapshotRasterReferences(indices) { if (pixelEdit) commitPixelPatch();
  const entry = createRasterReferenceEntry(indices, S); if (!entry) return false;
  S.undoStack.push(entry); trimUndo(); S.redoStack.length = 0;
  bus.emit('snapshot'); return true; }

export function snapshotCompound({ structure = false, effects = [], raster = [] }) {
  if (pixelEdit) commitPixelPatch(); const entries = [];
  if (structure) entries.push(createStructureEntry(S));
  if (effects.length) entries.push(createEffectsEntry(effects, S));
  if (raster.length) entries.push(createRasterReferenceEntry(raster, S));
  const entry = createCompoundEntry(entries); if (!entry || entries.some((item) => !item)) return false;
  S.undoStack.push(entry); trimUndo(); S.redoStack.length = 0; bus.emit('snapshot'); return true; }

export function snapshotDocumentRemap() { if (pixelEdit) commitPixelPatch();
  const entry = createDocumentRemapEntry(S); if (!entry) return false;
  S.undoStack.push(entry); trimUndo(); S.redoStack.length = 0;
  bus.emit('snapshot'); return true; }

export function snapshot() { if (pixelEdit) commitPixelPatch(); S.undoStack.push(snapState());
  trimUndo(); // глубина истории по площади холста (config)
  S.redoStack.length = 0; bus.emit('snapshot'); }

export function restore(s) { pixelEdit = null;
  S.W = s.W; S.H = s.H; S.layers = s.layers; S.folders = s.folders; S.folderSeq = s.folderSeq;
  if (s.tilesets) { S.tilesets = s.tilesets; S.tilesetSeq = s.tilesetSeq || 0; } // тайлсеты — источник пикселей тайлов
  S.bg = s.bg ? { color: s.bg.color ? s.bg.color.slice() : null, visible: s.bg.visible !== false } : { color: null, visible: true }; S.bgSel = false;
  S.cur = Math.min(s.cur, S.layers.length - 1); S.marked.clear(); S.fxSel.clear(); S.fxCur = null;
  S.fxDraft = null;
  syncHistoryFrame(s.animRef);
  dirtyAll(); bus.emitDoc(); }

// перехватчики undo: системы (напр. трансформация/живой preview попапа) могут
// на время «забрать» отмену до записи в историю.
let undoGuard = null;
const undoGuards = new Set();
export const setUndoGuard = (fn) => { undoGuard = fn; };
export const addUndoGuard = (fn) => { undoGuards.add(fn); return () => undoGuards.delete(fn); };

const swapScoped = (entry) => swapScopedEntry(entry,
  { state: S, markDirty, dirtyAll });

export function doUndo() { if (S.rotMode && actions.run('transform.cancel')) return;
  if ((S.sel || S.selFloat) && actions.run('select.none')) return;
  for (const guard of [...undoGuards]) if (guard && guard()) return;
  if (undoGuard && undoGuard()) return;
  bus.emit('before-undo'); // незавершённые жесты (плавающее выделение) оседают до снимка
  if (!S.undoStack.length) { toast(t('toast.nothingUndo')); return; }
  const entry = S.undoStack.pop();
  if (isScopedEntry(entry)) { const inverse = swapScoped(entry);
    if (!inverse) { S.undoStack.push(entry); return; } S.redoStack.push(inverse); bus.emitDoc(); }
  else { S.redoStack.push(snapState()); restore(entry); }
  toast(t('toast.undone')); }

export function doRedo() { if (!S.redoStack.length) return;
  bus.emit('before-undo');
  const entry = S.redoStack.pop();
  if (isScopedEntry(entry)) { const inverse = swapScoped(entry);
    if (!inverse) { S.redoStack.push(entry); return; } S.undoStack.push(inverse); bus.emitDoc(); }
  else { S.undoStack.push(snapState()); restore(entry); }
  toast(t('toast.redone')); }
