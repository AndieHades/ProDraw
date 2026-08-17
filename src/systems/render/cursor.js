// Курсор кисти: только прозрачный Photoshop-подобный контур фактического
// следующего отпечатка. Обводит внешний край, отверстия и отдельные островки.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { BP_SMAX } from '../../config/limits.js';
import { CURSOR_ALPHA_THRESHOLD, CURSOR_LINE_WIDTH,
  CURSOR_MODES, CURSOR_TOOLS } from '../../config/cursor.js';
import { footprintMask, footprintRotation } from '../../logic/brush-cursor.js';
import { alphaContour } from '../../logic/brush/alphaContour.ts';
import { brushCoverageSampler } from '../../logic/brush/brushCoverage.ts';
import { brushCursorMask } from '../../core/brush/brushCursorMask.ts';
import { C } from '../../styles/canvas-colors.js';

function inputs() {
  const tool = S.tool; if (!CURSOR_TOOLS.includes(tool)) return null;
  const source = tool === 'eraser' ? 'eraser' : 'pencil';
  return { sb: S.stampBrush[source], size: S.brushes[source].size };
}

const mod = (value, period) => period > 0
  ? ((Math.floor(value) % period) + period) % period : 0;
function stylusSample(x, y) { const input = S.hoverInput || {};
  return { x, y, pressure: Number.isFinite(input.pressure) ? input.pressure : 1,
    tiltX: input.tiltX || 0, tiltY: input.tiltY || 0, time: 0 }; }

let cacheKey = '', cache = null;
function loadedContour(loaded, size, x, y) {
  const sampler = brushCoverageSampler(loaded), sample = stylusSample(x, y);
  const pressure = Math.round(sample.pressure * 100), tiltX = Math.round(sample.tiltX / 2);
  const tiltY = Math.round(sample.tiltY / 2);
  const phase = sampler.textureWidth
    ? `${mod(x, sampler.textureWidth)},${mod(y, sampler.textureHeight)}` : 'plain';
  const key = `${loaded.id}@${loaded.revision}|${size}|${pressure}|${tiltX},${tiltY}|${phase}`;
  if (key === cacheKey && cache) return cache;
  const mask = brushCursorMask(loaded, size, sample);
  cacheKey = key; cache = { mask,
    segments: alphaContour(mask, CURSOR_ALPHA_THRESHOLD), rotation: 0 };
  return cache;
}

function legacyContour(sb, size, x, y) {
  const phase = sb?.grain ? `${mod(x, sb.grain.w)},${mod(y, sb.grain.h)}` : 'plain';
  const key = `${sb ? sb.tok : 'square'}|${size}|${phase}`;
  if (key === cacheKey && cache) return cache;
  const mask = footprintMask(sb, size, BP_SMAX, x, y);
  if (!mask) return null;
  const alpha = { width: mask.w, height: mask.h,
    data: Uint8Array.from(mask.data, (value) => value ? 255 : 0) };
  cacheKey = key; cache = { mask: { ...alpha,
    offsetX: -(mask.w >> 1), offsetY: -(mask.h >> 1) },
    segments: alphaContour(alpha, CURSOR_ALPHA_THRESHOLD),
    rotation: footprintRotation(sb) };
  return cache;
}

function drawSegments(ctx, contour, ox, oy, z, x, y) {
  const { mask, segments, rotation } = contour;
  const scale = mask.scale || 1, segmentZoom = z * scale;
  const left = ox + (x + mask.offsetX) * z;
  const top = oy + (y + mask.offsetY) * z;
  ctx.save();
  if (rotation || S.xMirror) { ctx.translate(left + mask.width * segmentZoom / 2,
    top + mask.height * segmentZoom / 2);
    if (rotation) ctx.rotate(rotation); if (S.xMirror) ctx.scale(-1, 1);
    ctx.translate(-mask.width * segmentZoom / 2, -mask.height * segmentZoom / 2); }
  ctx.globalCompositeOperation = 'difference';
  ctx.strokeStyle = C.fg; ctx.lineWidth = CURSOR_LINE_WIDTH;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
  const offsetX = rotation || S.xMirror ? 0 : left;
  const offsetY = rotation || S.xMirror ? 0 : top;
  for (const edge of segments) { ctx.moveTo(offsetX + edge.x1 * segmentZoom,
    offsetY + edge.y1 * segmentZoom);
    ctx.lineTo(offsetX + edge.x2 * segmentZoom, offsetY + edge.y2 * segmentZoom); }
  ctx.stroke(); ctx.restore();
}

function drawReticle(ctx, cx, cy) {
  const arm = 5, gap = 1.5; ctx.globalCompositeOperation = 'difference';
  ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - arm, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + arm); ctx.stroke();
}

export function drawBrushCursor(ctx, ox, oy, z) {
  if (!S.hoverPx || S.cropMode || S.selFloat || !S.layers[S.cur]) return;
  const [x, y] = S.hoverPx, cx = ox + (x + .5) * z, cy = oy + (y + .5) * z;
  if (S.eyedrop.active) { ctx.save(); drawReticle(ctx, cx, cy); ctx.restore(); return; }
  const input = inputs(); if (!input) return;
  const contour = input.sb?.loaded
    ? loadedContour(input.sb.loaded, input.size, x, y)
    : legacyContour(input.sb, input.size, x, y);
  if (contour) drawSegments(ctx, contour, ox, oy, z, x, y);
}

actions.register('cursor.cycleMode', () => {
  S.cursorMode = CURSOR_MODES[0]; bus.emit('cursor'); bus.emit('render');
});
