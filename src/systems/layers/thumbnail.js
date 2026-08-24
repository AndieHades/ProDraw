import { makeCanvas } from '../../core/canvas.js';
import { layerCanvas, layerContentBounds } from '../../core/layer-cache.js';
import { C } from '../../styles/canvas-colors.ts';

const SIZE = 40;

export function thumbnailDrawBox(bounds, size = SIZE) {
  const sw = bounds.maxx - bounds.minx + 1;
  const sh = bounds.maxy - bounds.miny + 1;
  const dw = size * sw / sh;
  return { sx: bounds.minx, sy: bounds.miny, sw, sh,
    dx: (size - dw) / 2, dy: 0, dw, dh: size };
}

export function layerThumbnail(index) {
  const canvas = makeCanvas(SIZE, SIZE); canvas.className = 'lth';
  const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
  context.fillStyle = C.checkA; context.fillRect(0, 0, SIZE, SIZE);
  const bounds = layerContentBounds(index); if (!bounds) return canvas;
  const box = thumbnailDrawBox(bounds);
  context.drawImage(layerCanvas(index), box.sx, box.sy, box.sw, box.sh,
    box.dx, box.dy, box.dw, box.dh);
  return canvas;
}
