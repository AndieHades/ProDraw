// Жизненный цикл штриха: начать (снимок + сброс pp), отменить (откат), завершить
// (обновить список слоёв, если панель открыта).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $ } from '../../core/dom.js';
import { beginPixelBatch, beginPixelPatch, cancelPixelPatch, commitPixelPatch,
  pixelPatchActive, snapshot, snapshotRasterReferences,
  restore } from '../../core/history.js';
import { swapRasterReferenceEntry } from '../../core/history/rasterReferencePatch.js';
import { markDirty } from '../../core/layer-cache.js';
import { isTextLayer } from '../../logic/text-model.js';
import { resetPP } from './pixel-perfect.js';
import { resetScatter } from './brush.js';

let referenceStroke = null;

function beginTextReference() {
  if (!isTextLayer(S.layers[S.cur]) || !snapshotRasterReferences([S.cur])) return false;
  referenceStroke = S.undoStack.at(-1); return true;
}

function cancelTextReference() {
  const entry = referenceStroke; referenceStroke = null;
  if (!entry || S.undoStack.at(-1) !== entry) return false;
  S.undoStack.pop();
  return !!swapRasterReferenceEntry(entry, S, markDirty);
}

export function beginStroke(lightweight = false, bulk = false) { bus.emit('stroke-begin');
  referenceStroke = null;
  const started = lightweight && (bulk ? beginPixelBatch([S.cur]) : beginPixelPatch());
  if (!started && !beginTextReference()) snapshot();
  S.stroke = true; resetPP(); resetScatter(); }
export function cancelStroke() { if (!S.stroke) return;
  const patched = pixelPatchActive();
  if (patched) { const changed = cancelPixelPatch(); S.stroke = false;
    if (changed) bus.emitDoc(); return; }
  S.stroke = false; if (cancelTextReference()) { bus.emitDoc(); return; }
  if (S.undoStack.length) restore(S.undoStack.pop()); }
export function afterStroke() { commitPixelPatch(); referenceStroke = null;
  const p = $('lay-pop'); if (p && p.classList.contains('on')) bus.emit('layers'); }
