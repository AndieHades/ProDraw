// Лёгкий твёрдый отпечаток Pencil/Eraser без preset, pressure или preview.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.ts';
import { createCellPainter } from './cells.js';

let active = null;
export function resetScatter() { active = null; }
bus.on('stroke-begin', resetScatter);
bus.on('stroke-end', resetScatter);

function paintSym(x, y, opacity, paint) {
  for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false, symmetryConfig())) {
    paint(px, py, opacity);
  }
}

export function brushStampWith(x, y, tool, paint) {
  const size = tool === 'eraser' ? S.eraserSize : S.pencilSize;
  const radius = Math.max(0, (size - 1) / 2), start = Math.floor(-radius), end = Math.ceil(radius);
  for (let dy = start; dy <= end; dy++) for (let dx = start; dx <= end; dx++) {
    if (S.brushShape[tool] === 'square' || dx * dx + dy * dy <= radius * radius) {
      paintSym(x + dx, y + dy, S.brushOpacity[tool], paint);
    }
  }
}

export function brushStamp(x, y, erase, flush = true) {
  if (!active || active.erase !== erase) {
    active = { erase, painter: createCellPainter(erase) };
  }
  brushStampWith(x, y, erase ? 'eraser' : 'pencil', active.painter.paint);
  if (flush) active.painter.flush();
  if (!S.stroke) active = null;
}

export function flushBrushStroke() { active?.painter.flush(); }
