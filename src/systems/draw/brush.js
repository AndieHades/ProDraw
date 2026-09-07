// Лёгкий твёрдый отпечаток Pencil/Eraser без preset, pressure или preview.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { createCellPainter } from './cells.js';

let active = null;
export function resetScatter() { active = null; }
bus.on('stroke-begin', resetScatter);
bus.on('stroke-end', resetScatter);

// Симметрию применяет получатель отпечатка: painter из cells.js считает её
// конфигурацию один раз на штрих. Раньше отпечаток вызывал symmetryConfig и
// mirrorPoints на каждый пиксель, а painter зеркалил результат ещё раз.
export function brushStampWith(x, y, tool, paint) {
  const size = tool === 'eraser' ? S.eraserSize : S.pencilSize;
  const radius = Math.max(0, (size - 1) / 2);
  const start = Math.floor(-radius), end = Math.ceil(radius);
  const square = S.brushShape[tool] === 'square';
  const opacity = S.brushOpacity[tool], limit = radius * radius;
  for (let dy = start; dy <= end; dy++) for (let dx = start; dx <= end; dx++) {
    if (square || dx * dx + dy * dy <= limit) paint(x + dx, y + dy, opacity);
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
