// История: снимок всего документа (слои + размеры) и откат. Восстановление
// шлёт события 'layers'/'render' — история не знает про системы визуала.
import { S, cloneFx, cloneLayer } from './state.js';
import * as bus from './bus.js';
import * as actions from './actions.js';
import { toast, t } from './dom.js';
import { dirtyAll } from './layer-cache.js';
import { historyCap } from '../config/limits.js';
import { cloneGrid } from '../logic/raster.js';
import { cloneTileset } from '../logic/tileset-data.js';
import { historyRef, syncHistoryFrame } from './animation.js';

export { cloneGrid }; // канон — в logic/raster.js; реэкспорт для прежних импортов из истории

function snapState() {
  return { cur: S.cur, W: S.W, H: S.H, folderSeq: S.folderSeq, folders: S.folders.map((f) => ({ ...f, effects: cloneFx(f.effects) })),
    bg: { color: S.bg.color ? S.bg.color.slice() : null, visible: S.bg.visible !== false },
    animRef: historyRef(),
    tilesetSeq: S.tilesetSeq, tilesets: S.tilesets.map(cloneTileset),
    layers: S.layers.map((L) => cloneLayer(L)) };
}

export function snapshot() { S.undoStack.push(snapState());
  const cap = historyCap(S.W * S.H); // глубина истории по площади холста (config)
  if (S.undoStack.length > cap) S.undoStack.splice(0, S.undoStack.length - cap);
  S.redoStack.length = 0; bus.emit('snapshot'); }

export function restore(s) { S.W = s.W; S.H = s.H; S.layers = s.layers; S.folders = s.folders; S.folderSeq = s.folderSeq;
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

export function doUndo() { if (S.rotMode && actions.run('transform.cancel')) return;
  if ((S.sel || S.selFloat) && actions.run('select.none')) return;
  for (const guard of [...undoGuards]) if (guard && guard()) return;
  if (undoGuard && undoGuard()) return;
  bus.emit('before-undo'); // незавершённые жесты (плавающее выделение) оседают до снимка
  if (!S.undoStack.length) { toast(t('toast.nothingUndo')); return; }
  S.redoStack.push(snapState()); restore(S.undoStack.pop()); toast(t('toast.undone')); }

export function doRedo() { if (!S.redoStack.length) return;
  bus.emit('before-undo');
  S.undoStack.push(snapState()); restore(S.redoStack.pop()); toast(t('toast.redone')); }
