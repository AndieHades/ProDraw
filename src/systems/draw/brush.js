// Лёгкий твёрдый отпечаток Pencil/Eraser без preset, pressure или preview.
import { S } from '../../core/state.js';
import { symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.js';
import { paintCell } from './cells.js';

export function resetScatter() {}

function paintSym(x, y, erase, opacity, paint) {
  for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false, symmetryConfig())) {
    if (paint === paintCell) paint(px, py, erase, opacity);
    else paint(px, py, opacity);
  }
}

export function brushStampWith(x, y, tool, paint, erase = false) {
  const size = tool === 'eraser' ? S.eraserSize : S.pencilSize;
  const radius = Math.max(0, (size - 1) / 2), start = Math.floor(-radius), end = Math.ceil(radius);
  for (let dy = start; dy <= end; dy++) for (let dx = start; dx <= end; dx++) {
    if (S.brushShape[tool] === 'square' || dx * dx + dy * dy <= radius * radius) {
      paintSym(x + dx, y + dy, erase, S.brushOpacity[tool], paint);
    }
  }
}

export function brushStamp(x, y, erase) {
  brushStampWith(x, y, erase ? 'eraser' : 'pencil', paintCell, erase);
}
