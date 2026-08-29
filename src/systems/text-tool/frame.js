import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { snapshotRasterReferences } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { textDamageBounds, updateTextLayerGrid } from '../../core/text-layer.js';
import { cloneTextSource } from '../../logic/text-model.ts';
import { C } from '../../styles/canvas-colors.ts';
import { resizeTextBox, textFrameHit,
  textFramePoints } from '../../logic/TextGeometry.ts';

let boxDrag = null;
let sourceFn = () => null, layerFn = () => null, fontsFn = () => [], placeFn = () => {}, editingFn = () => false;

export function configureFrame(opts) {
  sourceFn = opts.source; layerFn = opts.layer; fontsFn = opts.fonts; placeFn = opts.place;
  editingFn = opts.editing || editingFn;
}

export function drawFrame({ ctx, ox, oy, z }) {
  const source = sourceFn(), pts = source && textFramePoints(source);
  if (!pts || S.rotMode) return;
  const p = pts.map((q) => ({ x: ox + q.x * z, y: oy + q.y * z }));
  ctx.save(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.accent; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
  ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.accent;
  for (const q of p) ctx.fillRect(q.x - 4, q.y - 4, 8, 8);
  ctx.restore();
}

function frameHit(gx, gy) {
  const src = sourceFn();
  if (!src || S.tool !== 'text' || S.rotMode) return null;
  return textFrameHit(src, gx, gy, Math.max(1, 8 / S.view.zoom));
}

function applyBoxDrag(gx, gy) {
  const { src, layer, box, side } = boxDrag;
  const before = cloneTextSource(src);
  src.box = resizeTextBox(src, box, side, gx, gy);
  if (layer) {
    layer.text = cloneTextSource(src);
    updateTextLayerGrid(layer, S.W, S.H, fontsFn(), before);
    boxDrag.src = layer.text;
    markDirty(S.layers.indexOf(layer), textDamageBounds(before, layer.text, S.W, S.H));
  }
  placeFn(); bus.emit('render'); if (layer) bus.emit('layers');
}

function cursor(hit) {
  if (!hit) return null;
  if (hit === 'tl' || hit === 'br') return 'nwse-resize';
  if (hit === 'tr' || hit === 'bl') return 'nesw-resize';
  return hit === 'l' || hit === 'r' ? 'ew-resize' : 'ns-resize';
}

export const frameHandler = {
  down({ gx, gy }) {
    const side = frameHit(gx, gy);
    if (!side) return false;
    const src = sourceFn(), layer = layerFn();
    if (layer && !editingFn()) snapshotRasterReferences([S.layers.indexOf(layer)]);
    boxDrag = { side, src, layer, box: { ...src.box } };
    return true;
  },
  move({ gx, gy }) { if (boxDrag) applyBoxDrag(gx, gy); },
  up() { boxDrag = null; },
  hover({ gx, gy }) { return cursor(frameHit(gx, gy)); },
};
