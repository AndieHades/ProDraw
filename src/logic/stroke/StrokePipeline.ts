import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { interpolateStrokeSample } from "./interpolateStroke.ts";
import { applyStylusResponse } from "./pressureResponse.ts";
import { strokeRandom } from "../brush/strokeRandom.ts";
import { StrokeStabilizer } from "./StrokeStabilizer.ts";
import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import { taperResponse } from "./taperResponse.ts";
import { DEFAULT_SHAPE } from "../../config/brushDefaults.ts";

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
  #distanceToNext = 0;
  #dab = 0;
  #plan: StrokeSample[] = [];

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
    const output = this.samples(this.#stabilizer.finish());
    const endpoint = this.#last;
    if (endpoint && this.#plannedSource && !this.sameSample(endpoint, this.#plannedSource)) {
      output.push(this.plan(endpoint, true));
    }
    return output;
  }

  completedPlan(): readonly StrokeSample[] {
    if (this.#plan.length <= 1) return this.#plan;
    return this.#plan.map((sample) => {
      const remaining = this.#travelled - (sample.travelled ?? 0);
      const taper = taperResponse(this.#brush.taper, sample.travelled ?? 0, this.#size,
        sample.pressure, sample.pointerType, remaining);
      return { ...sample, sizeScale: taper.sizeScale,
        opacityScale: taper.opacityScale };
    });
  }

  private samples(points: readonly StrokeSample[]): StrokeSample[] {
    const output: StrokeSample[] = [];
    for (const point of points) this.append(point, output);
    return output;
  }

  private append(point: StrokeSample, output: StrokeSample[]): void {
    const start = this.#last;
    if (!start) {
      this.#last = point; output.push(this.plan(point, false));
      this.#distanceToNext = this.nextSpacing(); return;
    }
    const distance = Math.hypot(point.x - start.x, point.y - start.y);
    if (distance <= 0) { this.#last = point; return; }
    let consumed = 0;
    while (distance - consumed + 1e-9 >= this.#distanceToNext) {
      consumed += this.#distanceToNext;
      const sample = interpolateStrokeSample(start, point, consumed / distance);
      output.push(this.plan(sample, false));
      this.#distanceToNext = this.nextSpacing();
    }
    this.#distanceToNext -= distance - consumed;
    this.#last = point;
  }

  private nextSpacing(): number {
    const jitter = (strokeRandom(this.#brush.id, this.#dab, 1) * 2 - 1) *
      this.#brush.strokePath.spacingJitter;
    return rasterDabSpacing(this.#size, this.#spacing * (1 + jitter) / this.#size);
  }

  private sameSample(left: StrokeSample, right: StrokeSample): boolean {
    return Math.hypot(left.x - right.x, left.y - right.y) < 0.001 &&
      Math.abs(left.pressure - right.pressure) < 0.001 &&
      Math.abs(left.tiltX - right.tiltX) < 0.001 &&
      Math.abs(left.tiltY - right.tiltY) < 0.001;
  }

  private plan(sample: StrokeSample, exactPosition: boolean): StrokeSample {
    const previous = this.#plannedSource;
    const distance = previous ? Math.hypot(sample.x - previous.x, sample.y - previous.y) : 0;
    const elapsed = previous ? Math.max(1, sample.time - previous.time) : 1;
    this.#travelled += distance;
    const directionX = distance > 0 && previous ? (sample.x - previous.x) / distance : 1;
    const directionY = distance > 0 && previous ? (sample.y - previous.y) / distance : 0;
    this.#plannedSource = sample;
    const path = this.#brush.strokePath;
    const centeredLinear = strokeRandom(this.#brush.id, this.#dab, 2) * 2 - 1;
    const centeredLateral = strokeRandom(this.#brush.id, this.#dab, 3) * 2 - 1;
    const linear = centeredLinear * path.linearJitter * this.#size;
    const lateral = centeredLateral * path.lateralJitter * this.#size;
    const taper = taperResponse(this.#brush.taper, this.#travelled, this.#size,
      sample.pressure, sample.pointerType);
    const falloffScale = Math.max(0.08, 1 - path.fallOff *
      this.#travelled / (this.#size * 20));
    const dabIndex = this.#dab;
    this.#dab += 1;
    const pathAngle = Math.atan2(directionY, directionX);
    const tiltAngle = Math.hypot(sample.tiltX, sample.tiltY) > 0.01
      ? Math.atan2(sample.tiltY, sample.tiltX) : pathAngle;
    const shapeInput = this.#brush.shape.inputStyle ?? DEFAULT_SHAPE.inputStyle;
    const shapeRotation = this.#brush.shape.rotation ?? DEFAULT_SHAPE.rotation;
    const shapeAngle = shapeInput === "touch" ? pathAngle : tiltAngle;
    const rotation = this.#brush.properties.orientToScreen ? 0 :
      ((this.#brush.shape.relativeToStroke ?? DEFAULT_SHAPE.relativeToStroke) ||
        shapeRotation !== 0 ? shapeAngle * shapeRotation : 0);
    const planned = { ...sample,
      x: exactPosition ? sample.x : sample.x + directionX * linear - directionY * lateral,
      y: exactPosition ? sample.y : sample.y + directionY * linear + directionX * lateral,
      pressure: Math.max(0.01, sample.pressure * falloffScale),
      speed: distance / elapsed, travelled: this.#travelled,
      sizeScale: taper.sizeScale, opacityScale: taper.opacityScale,
      rotation, dabIndex, exactPosition };
    this.#plan.push(planned); return planned;
  }
}
