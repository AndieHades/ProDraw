// Буфер обмена: копировать/вырезать/вставить/удалить (выделение или весь слой).
import { S, G, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import {
  doRedo,
  doUndo,
  snapshotStructure,
} from '../../core/history.js';
import { clearLayer } from '../../core/document.js';
import { layerContentBounds, dirtyAll } from '../../core/layer-cache.js';
import { toast, t } from '../../ui/dom/ShellDom.ts';
import { MAX_LAYERS } from '../../config/limits.ts';
import { parseKey, setGridBounds } from '../../logic/raster.js';
import { symA, symHA } from '../../core/layers.js';
import { deleteSelContent, deselect } from './model.js';
import { commitFloat } from './float.js';
import { maskHas } from '../../core/selection.js';
import { captureSelectionFragment, pasteFragment } from './fragment.js';

let clip = null;

// при симметрии — разбить содержимое выделения на стороны (абсолютные координаты),
// чтобы вставить их отдельными слоями (напр. два глаза → два слоя). Иначе null.
function captureSym() { commitFloat(); if (!S.selMask || (!symA() && !symHA())) return null;
  const g = G(), pieces = new Map(), bounds = layerContentBounds(S.cur); if (!bounds) return null;
  const x0 = Math.max(S.sel.x0, bounds.minx), x1 = Math.min(S.sel.x1, bounds.maxx);
  const y0 = Math.max(S.sel.y0, bounds.miny), y1 = Math.min(S.sel.y1, bounds.maxy);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = g[y] && g[y][x];
    if (!c || !maskHas(S.selMask, x, y)) continue; const k = x + ',' + y;
    const key = (symA() && x * 2 >= S.W ? 1 : 0) + (symHA() && y * 2 >= S.H ? 2 : 0);
    if (!pieces.has(key)) pieces.set(key, new Map()); pieces.get(key).set(k, c.slice()); }
  const out = [...pieces.values()].filter((m) => m.size); return out.length > 1 ? out : null; }

export function doCopy() { if (!S.layers[S.cur]) return; const p = captureSym();
  clip = p ? { pieces: p } : { fragment: captureSelectionFragment() };
  toast(S.sel ? t('toast.selCopied') : t('toast.layerCopied')); }
export function doCut() { if (!S.layers[S.cur]) return; const p = captureSym();
  clip = p ? { pieces: p } : { fragment: captureSelectionFragment() };
  toast((S.sel ? deleteSelContent() : clearLayer()) ? t('toast.cut') : t('toast.hereEmpty')); }
export function copySelectionLayer() { if (!S.sel) return; doCopy(); doPaste(); }

// каждую симметричную сторону — отдельным новым слоем, на исходное место
function pasteLayer(name) { const nl = newLayer(name, S.W, S.H); nl.fid = S.layers[S.cur].fid;
  S.layers.splice(S.cur + 1, 0, nl); S.cur++; return nl; }
function pastePieces(pieces) { commitFloat(); snapshotStructure();
  for (const cells of pieces) { if (S.layers.length >= MAX_LAYERS) break; const nl = pasteLayer(t('layer.pasteName'));
    let bounds = null;
    for (const [k, c] of cells) { const [x, y] = parseKey(k); nl.grid[y][x] = c.slice();
      if (!bounds) bounds = { minx: x, miny: y, maxx: x, maxy: y };
      else { bounds.minx = Math.min(bounds.minx, x); bounds.miny = Math.min(bounds.miny, y);
        bounds.maxx = Math.max(bounds.maxx, x); bounds.maxy = Math.max(bounds.maxy, y); } }
    setGridBounds(nl.grid, bounds, true); }
  S.marked.clear(); dirtyAll({ preserveGridBounds: true }); S.sel = null; S.selMask = null;
  bus.emit('selection'); bus.emitDoc(); toast(t('toast.pastedNew')); }

export function doPaste() { if (!clip) { toast(t('toast.bufferEmpty')); return; }
  if (clip.pieces) { pastePieces(clip.pieces); return; }
  const fragment = clip.fragment; commitFloat();
  const px = S.sel ? S.sel.x0 : 0, py = S.sel ? S.sel.y0 : 0;
  snapshotStructure();
  const nl = newLayer(t('layer.pasteName'), S.W, S.H); nl.fid = S.layers[S.cur].fid;
  S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear();
  const g = nl.grid;
  const pasted = pasteFragment(fragment, g, px, py, S.W, S.H);
  setGridBounds(g, pasted.bounds, true); dirtyAll({ preserveGridBounds: true });
  S.sel = null; S.selMask = null;
  bus.emit('selection'); bus.emitDoc(); toast(t('toast.pastedNew')); }

export function doDelete() { if (S.fxCur || S.fxSel.size) { actions.run('fx.delete'); return; } // выбран эффект/настройка → удалить его
  if (S.sel) { if (deleteSelContent()) toast(t('toast.selDeleted')); return; } // есть выделение пикселей → стереть его
  actions.run('layer.delete'); } // иначе удалить активную строку из списка (слой/папка); фон не трогаем

actions.register('edit.copy', doCopy); actions.register('edit.cut', doCut);
actions.register('edit.paste', doPaste); actions.register('edit.delete', doDelete);
actions.register('selection.copyLayer', copySelectionLayer);
actions.register('select.none', deselect);
actions.register('edit.undo', doUndo);
actions.register('edit.redo', doRedo);
