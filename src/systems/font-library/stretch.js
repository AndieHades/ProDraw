import { makeCanvas } from '../../core/canvas.js';
import { fontById } from '../../core/font-store.js';
import { TEXT_STRETCH } from '../../config/text.js';
import { clamp } from '../../logic/math.js';
import { maxLineWidth } from '../../logic/text-layout.js';

export function stretchedTextTransform(source, fonts) {
  const context = makeCanvas(1, 1).getContext('2d');
  context.font = `${source.size}px ${fontById(source.fontId, fonts).family}`;
  const width = maxLineWidth(source, (line) => context.measureText(line).width);
  const scaleX = clamp(source.box.w / width,
    TEXT_STRETCH.minScale, TEXT_STRETCH.maxScale);
  return { ...source.transform, scaleX };
}
