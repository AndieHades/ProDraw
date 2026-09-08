// Ход пресет-кистью: сэмплы указателя идут в StrokePipeline, который держит
// интервал, стабилизацию и taper, а каждый запланированный даб рисуется
// в тот же painter, что и твёрдый отпечаток.
import type { LoadedBrush } from "../../contracts/brush.ts";
import type { BrushRenderSettings, StrokeBounds, StrokeSample } from "../../contracts/stroke.ts";
import type { StrokePipeline } from "../../logic/stroke/StrokePipeline.ts";
import { presetEngine } from "./preset-brush.ts";

interface StrokePainter {
  readonly paint: (x: number, y: number, opacity: number) => void;
  readonly reset?: (bounds?: StrokeBounds) => void;
  readonly flush?: () => void;
  readonly localReplay?: boolean;
}

interface ActiveStroke {
  readonly brush: LoadedBrush;
  readonly painter: StrokePainter;
  readonly pipeline: StrokePipeline;
  readonly settings: BrushRenderSettings;
}

let stroke: ActiveStroke | null = null;

export const presetStrokeActive = (): boolean => stroke !== null;

export function beginPresetStroke(brush: LoadedBrush, painter: StrokePainter,
  settings: BrushRenderSettings, maximumSegment?: number): boolean {
  const engine = presetEngine(); if (!engine) return false;
  stroke = { brush, painter, pipeline: new engine.StrokePipeline(brush,
    Math.max(1, settings.size), maximumSegment), settings };
  return true;
}

function render(active: ActiveStroke, dabs: readonly StrokeSample[]): void {
  const engine = presetEngine(); if (!engine) return;
  for (const dab of dabs) {
    engine.visitBrushDab(active.brush, dab, active.settings, active.painter.paint);
  }
}

export function pushPresetSample(sample: StrokeSample | null): void {
  if (stroke && sample) render(stroke, stroke.pipeline.push(sample));
}

export function finishPresetStroke(): boolean {
  const active = stroke; if (!active) return false;
  stroke = null; render(active, active.pipeline.finish());
  const patch = active.pipeline.tailPatch();
  if (patch && active.painter.reset) {
    active.painter.flush?.();
    if (active.painter.localReplay) {
      const clip = active.settings.bounds;
      const bounds = clip ? { minx: Math.max(clip.minx, patch.bounds.minx),
        miny: Math.max(clip.miny, patch.bounds.miny), maxx: Math.min(clip.maxx, patch.bounds.maxx),
        maxy: Math.min(clip.maxy, patch.bounds.maxy) } : patch.bounds;
      active.painter.reset(bounds);
      render({ ...active, settings: { ...active.settings, bounds } }, patch.samples);
    } else { active.painter.reset(); render(active, active.pipeline.completedPlan()); }
  }
  return true;
}

export function cancelPresetStroke(): void { stroke = null; }
