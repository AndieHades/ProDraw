// Твёрдый отпечаток Pencil/Eraser: мягкий край и субпиксельный путь без preset.
import { S } from '../../core/state.ts';
import * as bus from '../../core/bus.ts';
import { createCellPainter } from './cells.js';
import { presetBrushForShape } from './preset-brush.ts';
import { stampTip, tipRadius, tipSpacing } from './soft-tip.ts';
import { clipSegmentToBox } from '../../logic/input/segmentClip.ts';
import { beginPresetStroke, cancelPresetStroke, finishPresetStroke,
  presetStrokeActive, pushPresetSample } from './preset-stroke.ts';

let active = null;
export function resetScatter() { active = null; cancelPresetStroke(); }
bus.on('stroke-begin', resetScatter);
bus.on('stroke-end', resetScatter);

const toolSize = (tool) => tool === 'eraser' ? S.eraserSize : S.pencilSize;
// Разрыв длиннее диагонали холста — перескок пера, а не ход.
const documentSpan = () => Math.hypot(S.W, S.H);
const radiusOf = (tool) => tipRadius(toolSize(tool));

// Симметрию применяет получатель отпечатка: painter из cells.js считает её
// конфигурацию один раз на штрих. Раньше отпечаток вызывал symmetryConfig и
// mirrorPoints на каждый пиксель, а painter зеркалил результат ещё раз.
export function brushStampWith(x, y, tool, paint) {
  stampTip(x + .5, y + .5, radiusOf(tool), S.brushShape[tool] === 'square',
    S.brushOpacity[tool], paint);
}

// Между сэмплами указателя ход ведём субпиксельным шагом: целочисленный
// Брезенхем оставлял ступеньки, а на быстром движении — разрывы. Отрезок
// обрезается по холсту: планшет позиционируется абсолютно, и соседние сэмплы
// могут отстоять на десятки тысяч пикселей документа, которые всё равно никуда
// не попадут. В Tile Mode обрезать нельзя — там мазок за краем заворачивается.
function dragTip(x, y, tool) {
  const radius = radiusOf(tool), square = S.brushShape[tool] === 'square';
  const opacity = S.brushOpacity[tool], from = active.point;
  const put = (px, py) => stampTip(px, py, radius, square, opacity, active.painter.paint);
  if (!from) { put(x, y); active.point = [x, y]; return; }
  const dx = x - from[0], dy = y - from[1];
  const span = S.tile && S.tile.on ? { from: 0, to: 1 }
    : clipSegmentToBox(from[0], from[1], x, y, S.W, S.H, radius + 1);
  if (span) {
    const covered = Math.sqrt(dx * dx + dy * dy) * (span.to - span.from);
    const steps = Math.max(1, Math.ceil(covered / tipSpacing(radius)));
    // Начало отрезка уже отпечатано прошлым сэмплом; точку входа в холст —
    // ставим, если отрезок пришёл извне.
    for (let i = span.from > 0 ? 0 : 1; i < steps; i++) {
      const at = span.from + (span.to - span.from) * i / steps;
      put(from[0] + dx * at, from[1] + dy * at);
    }
  }
  put(x, y); active.point = [x, y];
}

const centred = (x, y) => ({ x: x + .5, y: y + .5, pressure: 1, tiltX: 0,
  tiltY: 0, time: 0, pointerType: 'mouse' });

export function brushStamp(x, y, erase, flush = true, sample = null) {
  if (!active || active.erase !== erase) {
    active = { erase, painter: createCellPainter(erase), point: null };
  }
  const tool = erase ? 'eraser' : 'pencil';
  const preset = presetBrushForShape(S.brushShape[tool]);
  const ready = preset && (presetStrokeActive() || beginPresetStroke(preset,
    active.painter, { size: toolSize(tool),
      opacity: S.brushOpacity[tool], erase }, documentSpan()));
  if (ready) pushPresetSample(sample ?? centred(x, y));
  else dragTip(sample ? sample.x : x + .5, sample ? sample.y : y + .5, tool);
  if (flush) active.painter.flush();
  if (!S.stroke) active = null;
}

// Продолжение хода: интервал пресета держит StrokePipeline, твёрдый отпечаток —
// субпиксельный путь от предыдущего сэмпла.
export function continueBrushStroke(sample) {
  if (presetStrokeActive()) { pushPresetSample(sample); active?.painter.flush(); return true; }
  if (!active || !sample) return false;
  dragTip(sample.x, sample.y, active.erase ? 'eraser' : 'pencil');
  active.painter.flush(); return true;
}

export function flushBrushStroke() { active?.painter.flush(); }

// Завершение хода: хвостовые дабы пресета попадают в слой до снимка истории.
export function endBrushStroke() { finishPresetStroke(); active?.painter.flush(); }
