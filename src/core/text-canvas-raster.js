import { makeCanvas } from './canvas.js';
import { fontById } from './font-store.js';
import { normalizeTextSource } from '../logic/text-model.js';
import { displayLines, lineAdvance, lineWidth } from '../logic/text-layout.js';

const RASTER_PADDING = 2;

function transformedPoint(x, y, src) {
  const tr = src.transform, ca = Math.cos(tr.rotation), sa = Math.sin(tr.rotation);
  const sx = x * tr.scaleX, sy = y * tr.scaleY;
  return { x: src.box.x + src.box.w / 2 + tr.x + sx * ca - sy * sa,
    y: src.box.y + src.box.h / 2 + tr.y + sx * sa + sy * ca };
}

export function textRasterBounds(text, width, height) {
  const src = normalizeTextSource(text), halfWidth = src.box.w / 2;
  const halfHeight = src.box.h / 2;
  const points = [[-halfWidth, -halfHeight], [halfWidth, -halfHeight],
    [halfWidth, halfHeight], [-halfWidth, halfHeight]]
    .map(([x, y]) => transformedPoint(x, y, src));
  const x = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))) -
    RASTER_PADDING);
  const y = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))) -
    RASTER_PADDING);
  const right = Math.min(width, Math.ceil(Math.max(...points.map((point) => point.x))) +
    RASTER_PADDING);
  const bottom = Math.min(height, Math.ceil(Math.max(...points.map((point) => point.y))) +
    RASTER_PADDING);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y,
    minx: x, miny: y, maxx: right - 1, maxy: bottom - 1 };
}

function lineX(src, line, left, measure) {
  const width = lineWidth(src, line, measure);
  if (src.align === 'right') return left + src.box.w - width;
  if (src.align === 'center') return left + (src.box.w - width) / 2;
  return left;
}

function drawLine(context, src, line, x, y) {
  let cursor = x;
  for (const character of [...line]) {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + src.letterSpacing;
  }
}

export function rasterTextBox(text, width, height, fonts) {
  const src = normalizeTextSource(text);
  if (!src.value) return null;
  const bounds = textRasterBounds(src, width, height);
  if (!bounds) return null;
  const canvas = makeCanvas(bounds.width, bounds.height);
  const context = canvas.getContext('2d'), font = fontById(src.fontId, fonts);
  context.imageSmoothingEnabled = false; context.fillStyle = src.color;
  context.textBaseline = 'top'; context.textAlign = 'left';
  context.font = `${src.size}px ${font.family}`;
  context.save(); context.translate(-bounds.x, -bounds.y);
  context.translate(src.box.x + src.box.w / 2 + src.transform.x,
    src.box.y + src.box.h / 2 + src.transform.y);
  context.rotate(src.transform.rotation);
  context.scale(src.transform.scaleX, src.transform.scaleY);
  const left = -src.box.w / 2, top = -src.box.h / 2;
  context.beginPath(); context.rect(left, top, src.box.w, src.box.h); context.clip();
  const measure = (line) => context.measureText(line).width;
  let y = top;
  for (const line of displayLines(src)) {
    drawLine(context, src, line, lineX(src, line, left, measure), y);
    y += lineAdvance(src);
  }
  context.restore();
  return { bounds, data: context.getImageData(0, 0,
    bounds.width, bounds.height).data };
}
