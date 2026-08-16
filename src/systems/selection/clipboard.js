// Буфер обмена: копировать/вырезать/вставить/удалить (выделение или весь слой).
import { S, G, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, cloneGrid, doUndo, doRedo } from '../../core/history.js';
import { clearLayer } from '../../core/document.js';
import { markDirty, dirtyAll } from '../../core/layer-cache.js';
import { toast, t } from '../../core/dom.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { parseKey } from '../../logic/raster.js';
import { symA, symHA } from '../../core/layers.js';
import { fragFromSel, deleteSelContent, deselect } from './model.js';
import { commitFloat } from './float.js';

let clip = null;

// при симметрии — разбить содержимое выделения на стороны (абсолютные координаты),
// чтобы вставить их отдельными слоями (напр. два глаза → два слоя). Иначе null.
function captureSym() { commitFloat(); if (!S.selMask || (!symA() && !symHA())) return null;
  const g = G(), pieces = new Map();
  for (const k of S.selMask) { const [x, y] = parseKey(k); const c = g[y] && g[y][x]; if (!c) continue;
    const key = (symA() && x * 2 >= S.W ? 1 : 0) + (symHA() && y * 2 >= S.H ? 2 : 0);
    if (!pieces.has(key)) pieces.set(key, new Map()); pieces.get(key).set(k, c.slice()); }
  const out = [...pieces.values()].filter((m) => m.size); return out.length > 1 ? out : null; }

export function doCopy() { if (!S.layers[S.cur]) return; const p = captureSym(); clip = p ? { pieces: p } : { frag: S.sel ? fragFromSel() : cloneGrid(G()) }; toast(S.sel ? t('toast.selCopied') : t('toast.layerCopied')); }
export function doCut() { if (!S.layers[S.cur]) return; const p = captureSym(); clip = p ? { pieces: p } : { frag: S.sel ? fragFromSel() : cloneGrid(G()) }; toast((S.sel ? deleteSelContent() : clearLayer()) ? t('toast.cut') : t('toast.hereEmpty')); }
export function copySelectionLayer() { if (!S.sel) return; doCopy(); doPaste(); }

// каждую симметричную сторону — отдельным новым слоем, на исходное место
function pasteLayer(name) { const nl = newLayer(name, S.W, S.H); nl.fid = S.layers[S.cur].fid;
  S.layers.splice(S.cur + 1, 0, nl); S.cur++; return nl; }
function pastePieces(pieces) { commitFloat(); snapshot();
  for (const cells of pieces) { if (S.layers.length >= MAX_LAYERS) break; const nl = pasteLayer(t('layer.pasteName'));
    for (const [k, c] of cells) { const [x, y] = parseKey(k); nl.grid[y][x] = c.slice(); } }
  S.marked.clear(); dirtyAll(); S.sel = null; S.selMask = null;
  bus.emit('selection'); bus.emitDoc(); toast(t('toast.pastedNew')); }

export function doPaste() { if (!clip) { toast(t('toast.bufferEmpty')); return; }
  if (clip.pieces) { pastePieces(clip.pieces); return; }
  const clipG = clip.frag; commitFloat(); snapshot();
  const px = S.sel ? S.sel.x0 : 0, py = S.sel ? S.sel.y0 : 0, asNew = S.layers.length < MAX_LAYERS;
  let g;
  if (asNew) { const nl = newLayer(t('layer.pasteName'), S.W, S.H); nl.fid = S.layers[S.cur].fid; // вставка — на новый слой
    S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear(); dirtyAll(); g = nl.grid; }
  else g = G(); // достигнут лимит слоёв — в активный
  for (let y = 0; y < clipG.length; y++) for (let x = 0; x < clipG[y].length; x++) { const c = clipG[y][x]; if (!c) continue;
    const yy = py + y, xx = px + x; if (xx < 0 || yy < 0 || xx >= S.W || yy >= S.H) continue; g[yy][xx] = c.slice(); }
  S.sel = null; S.selMask = null;
  markDirty(S.cur); bus.emit('selection'); bus.emitDoc(); toast(asNew ? t('toast.pastedNew') : t('toast.pasted')); }

export function doDelete() { if (S.fxCur || S.fxSel.size) { actions.run('fx.delete'); return; } // выбран эффект/настройка → удалить его
  if (S.sel) { if (deleteSelContent()) toast(t('toast.selDeleted')); return; } // есть выделение пикселей → стереть его
  actions.run('layer.delete'); } // иначе удалить активную строку из списка (слой/папка); фон не трогаем

actions.register('edit.copy', doCopy); actions.register('edit.cut', doCut);
actions.register('edit.paste', doPaste); actions.register('edit.delete', doDelete);
actions.register('selection.copyLayer', copySelectionLayer);
actions.register('select.none', deselect);
actions.register('edit.undo', doUndo);
actions.register('edit.redo', doRedo);
