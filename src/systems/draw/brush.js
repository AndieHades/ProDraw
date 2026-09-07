// Лёгкий твёрдый отпечаток Pencil/Eraser без preset, pressure или preview.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { createCellPainter } from './cells.js';
import { presetBrushForShape } from './preset-brush.ts';
import { beginPresetStroke, cancelPresetStroke, finishPresetStroke,
  presetStrokeActive, pushPresetSample } from './preset-stroke.ts';

let active = null;
export function resetScatter() { active = null; cancelPresetStroke(); }
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

const centred = (x, y) => ({ x: x + .5, y: y + .5, pressure: 1, tiltX: 0,
  tiltY: 0, time: 0, pointerType: 'mouse' });

export function brushStamp(x, y, erase, flush = true, sample = null) {
  if (!active || active.erase !== erase) {
    active = { erase, painter: createCellPainter(erase) };
  }
  const tool = erase ? 'eraser' : 'pencil';
  const preset = presetBrushForShape(S.brushShape[tool]);
  const ready = preset && (presetStrokeActive() || beginPresetStroke(preset,
    active.painter, { size: erase ? S.eraserSize : S.pencilSize,
      opacity: S.brushOpacity[tool], erase }));
  if (ready) pushPresetSample(sample ?? centred(x, y));
  else brushStampWith(x, y, tool, active.painter.paint);
  if (flush) active.painter.flush();
  if (!S.stroke) active = null;
}

// Продолжение хода пресет-кистью: интервал и taper держит StrokePipeline.
export function continueBrushStroke(sample) {
  if (!presetStrokeActive()) return false;
  pushPresetSample(sample); active?.painter.flush(); return true;
}

export function flushBrushStroke() { active?.painter.flush(); }

// Завершение хода: хвостовые дабы пресета попадают в слой до снимка истории.
export function endBrushStroke() { finishPresetStroke(); active?.painter.flush(); }
