import { makeCanvas } from './canvas.js';
import { fontById } from './font-store.js';
import { normalizeTextSource } from '../logic/text-model.ts';
import { displayLines, lineAdvance, lineWidth } from '../logic/text-layout.ts';
import { textRasterBounds } from '../logic/TextGeometry.ts';
export { textRasterBounds } from '../logic/TextGeometry.ts';

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
