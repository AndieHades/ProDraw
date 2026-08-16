import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { interpolateStrokeSegment } from "./interpolateStroke";
import { applyStylusResponse } from "./pressureResponse";
import { StrokeStabilizer } from "./StrokeStabilizer";

export class StrokePipeline {
  readonly #brush: BrushPreset | LoadedBrush;
  readonly #spacing: number;
  readonly #stabilizer: StrokeStabilizer;
  #last: StrokeSample | null = null;

  constructor(brush: BrushPreset | LoadedBrush, size: number) {
    this.#brush = brush;
    this.#spacing = Math.max(0.25, size * brush.strokePath.spacing);
    this.#stabilizer = new StrokeStabilizer(brush.stabilization, size);
  }

  push(sample: StrokeSample): readonly StrokeSample[] {
    const adjusted = applyStylusResponse(sample, this.#brush.stylus);
    return this.samples(this.#stabilizer.push(adjusted));
  }

  finish(): readonly StrokeSample[] {
    return this.samples(this.#stabilizer.finish());
  }

  private samples(points: readonly StrokeSample[]): readonly StrokeSample[] {
    const output: StrokeSample[] = [];
    for (const point of points) {
      if (!this.#last) output.push(point);
      else output.push(...interpolateStrokeSegment(this.#last, point, this.#spacing));
      this.#last = point;
    }
    return output;
  }
}
