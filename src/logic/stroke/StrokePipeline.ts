import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { interpolateStrokeSegment } from "./interpolateStroke.ts";
import { applyStylusResponse } from "./pressureResponse.ts";
import { strokeRandom } from "../brush/strokeRandom.ts";
import { StrokeStabilizer } from "./StrokeStabilizer.ts";
import rasterConfig from "../../config/brush-raster.json" with { type: "json" };

export function rasterDabSpacing(size: number, requested: number): number {
  return Math.max(rasterConfig.dabSpacing.minimumPixels,
    Math.max(1, size) * rasterConfig.dabSpacing.minimumSizeRatio,
    Math.max(1, size) * requested);
}

export class StrokePipeline {
  readonly #brush: BrushPreset | LoadedBrush;
  readonly #spacing: number;
  readonly #size: number;
  readonly #stabilizer: StrokeStabilizer;
  #last: StrokeSample | null = null;
  #plannedSource: StrokeSample | null = null;
  #travelled = 0;
  #segment = 0;
  #dab = 0;

  constructor(brush: BrushPreset | LoadedBrush, size: number) {
    this.#brush = brush;
    this.#size = Math.max(1, size);
    this.#spacing = rasterDabSpacing(size, brush.strokePath.spacing);
    this.#stabilizer = new StrokeStabilizer(brush.stabilization, size);
  }

  push(sample: StrokeSample): readonly StrokeSample[] {
    const adjusted = applyStylusResponse(sample, this.#brush.stylus);
    return this.samples(this.#stabilizer.push(adjusted));
  }

  finish(): readonly StrokeSample[] {
    return this.samples(this.#stabilizer.finish(), true);
  }

  private samples(points: readonly StrokeSample[], finishing = false): readonly StrokeSample[] {
    const output: StrokeSample[] = [];
    for (const point of points) {
      const spacing = this.#spacing * (1 + (strokeRandom(this.#brush.id,
        this.#segment, 1) * 2 - 1) * this.#brush.strokePath.spacingJitter);
      const interpolated = this.#last
        ? interpolateStrokeSegment(this.#last, point,
          rasterDabSpacing(this.#size, spacing / this.#size)) : [point];
      for (const [index, sample] of interpolated.entries()) {
        output.push(this.plan(sample, finishing && index === interpolated.length - 1));
      }
      this.#last = point;
      this.#segment += 1;
    }
    return output;
  }

  private plan(sample: StrokeSample, exactPosition: boolean): StrokeSample {
    const previous = this.#plannedSource;
    const distance = previous ? Math.hypot(sample.x - previous.x, sample.y - previous.y) : 0;
    this.#travelled += distance;
    const directionX = distance > 0 && previous ? (sample.x - previous.x) / distance : 1;
    const directionY = distance > 0 && previous ? (sample.y - previous.y) / distance : 0;
    this.#plannedSource = sample;
    const path = this.#brush.strokePath;
    const centeredLinear = strokeRandom(this.#brush.id, this.#dab, 2) * 2 - 1;
    const centeredLateral = strokeRandom(this.#brush.id, this.#dab, 3) * 2 - 1;
    const scatterAngle = strokeRandom(this.#brush.id, this.#dab, 4) * Math.PI * 2;
    const scatterRadius = Math.sqrt(strokeRandom(this.#brush.id, this.#dab, 5)) *
      path.scatter * this.#size;
    const linear = centeredLinear * path.linearJitter * this.#size;
    const lateral = centeredLateral * path.lateralJitter * this.#size;
    const startDistance = Math.max(1, this.#brush.taper.start * this.#size * 4);
    const startProgress = Math.min(1, this.#travelled / startDistance);
    const taperInfluence = 1 - this.#brush.taper.pressure * 0.75;
    const startScale = this.#brush.taper.start > 0
      ? Math.max(0.08, 1 - (1 - startProgress) * taperInfluence) : 1;
    const endScale = Math.max(0.08, 1 - this.#brush.taper.end *
      (1 - sample.pressure) * taperInfluence);
    const falloffScale = Math.max(0.08, 1 - path.fallOff *
      this.#travelled / (this.#size * 20));
    this.#dab += 1;
    return { ...sample,
      x: exactPosition ? sample.x : sample.x + directionX * linear - directionY * lateral +
        Math.cos(scatterAngle) * scatterRadius,
      y: exactPosition ? sample.y : sample.y + directionY * linear + directionX * lateral +
        Math.sin(scatterAngle) * scatterRadius,
      pressure: Math.max(0.01, sample.pressure * startScale * endScale * falloffScale) };
  }
}
