// Полноценный raster-путь для .brush: настоящий shape/grain, динамика Huion,
// spacing, taper и стабилизация из Brush Studio поверх сохранённого UI.
import { S } from '../../core/state.js';
import { visitBrushDab } from '../../core/brush/renderBrushDab.ts';
import { StrokePipeline } from '../../logic/stroke/StrokePipeline.ts';
import { createCellPainter } from './cells.js';

let active = null;

const recordFor = (tool) => S.stampBrush[tool];
export const hasRasterBrush = (tool) => !!recordFor(tool)?.loaded;
export const rasterStrokeActive = () => !!active;

function inputSample(gx, gy, event) {
  const pen = event?.pointerType === 'pen';
  return { x: gx, y: gy,
    pressure: pen ? Math.max(0, Math.min(1, event.pressure || 0)) : 1,
    tiltX: pen ? event.tiltX || 0 : 0, tiltY: pen ? event.tiltY || 0 : 0,
    time: event?.timeStamp || performance.now(),
    pointerType: pen ? 'pen' : event?.pointerType === 'touch' ? 'touch' : 'mouse' };
}

function renderSamples(samples) {
  if (!active) return;
  const { brush, tool, painter } = active;
  const settings = { size: S.brushes[tool].size,
    opacity: S.brushes[tool].op, erase: tool === 'eraser' };
  for (const sample of samples) visitBrushDab(brush, sample, settings,
    painter.paint);
  painter.flush();
}

export function beginRasterStroke(tool, gx, gy, event) {
  const brush = recordFor(tool)?.loaded;
  if (!brush) return false;
  const pipeline = new StrokePipeline(brush, S.brushes[tool].size);
  active = { brush, pipeline, tool, painter: createCellPainter(tool === 'eraser') };
  renderSamples(pipeline.push(inputSample(gx, gy, event)));
  return true;
}

export function moveRasterStroke(gx, gy, event) {
  if (!active) return false;
  renderSamples(active.pipeline.push(inputSample(gx, gy, event)));
  return true;
}

export function finishRasterStroke() {
  if (!active) return false;
  active.pipeline.finish(); active.painter.reset();
  renderSamples(active.pipeline.completedPlan());
  active = null;
  return true;
}

export function cancelRasterStroke() {
  if (!active) return false;
  active = null;
  return true;
}
