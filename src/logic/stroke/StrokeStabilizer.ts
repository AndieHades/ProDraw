import type { BrushStabilization } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { POINTER_INPUT } from "../../config/input.ts";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const mix = (left: number, right: number, amount: number): number =>
  left + (right - left) * amount;
const timedAlpha = (alpha: number, elapsed: number): number => 1 - Math.pow(
  1 - clamp01(alpha), Math.max(0.25, elapsed) /
    POINTER_INPUT.stabilizationReferenceMilliseconds);

function sameSample(left: StrokeSample, right: StrokeSample): boolean {
  return Math.hypot(left.x - right.x, left.y - right.y) < 0.001 &&
    Math.abs(left.pressure - right.pressure) < 0.001 &&
    Math.abs(left.tiltX - right.tiltX) < 0.001 &&
    Math.abs(left.tiltY - right.tiltY) < 0.001;
}

export class StrokeStabilizer {
  readonly #settings: BrushStabilization;
  readonly #brushSize: number;
  #beforeRaw: StrokeSample | null = null;
  #lastRaw: StrokeSample | null = null;
  #twoBeforeOutput: StrokeSample | null = null;
  #beforeOutput: StrokeSample | null = null;
  #lastOutput: StrokeSample | null = null;

  constructor(settings: BrushStabilization, brushSize: number) {
    this.#settings = settings;
    this.#brushSize = Math.max(1, brushSize);
  }

  push(sample: StrokeSample): readonly StrokeSample[] {
    if (!this.#lastOutput || !this.#lastRaw) {
      this.#lastRaw = sample;
      this.#lastOutput = sample;
      return [sample];
    }
    const alpha = this.positionAlpha(sample);
    const elapsed = sample.time - this.#lastRaw.time;
    const pressureAlpha = timedAlpha(Math.max(0.04, 1 -
      this.#settings.streamlinePressure * 0.86 -
      this.#settings.motionFilteringAmount * 0.1), elapsed);
    const output = {
      x: mix(this.#lastOutput.x, sample.x, alpha),
      y: mix(this.#lastOutput.y, sample.y, alpha),
      pressure: mix(this.#lastOutput.pressure, sample.pressure, pressureAlpha),
      tiltX: mix(this.#lastOutput.tiltX, sample.tiltX, alpha),
      tiltY: mix(this.#lastOutput.tiltY, sample.tiltY, alpha),
      time: sample.time
    };
    this.#beforeRaw = this.#lastRaw;
    this.#lastRaw = sample;
    this.#twoBeforeOutput = this.#beforeOutput;
    this.#beforeOutput = this.#lastOutput;
    this.#lastOutput = output;
    return [output];
  }

  finish(): readonly StrokeSample[] {
    const target = this.#lastRaw;
    const output = this.#lastOutput;
    if (!target || !output || sameSample(target, output)) return [];
    const distance = Math.hypot(target.x - output.x, target.y - output.y);
    if (distance < 0.001) { this.#lastOutput = target; return [target]; }
    const steps = Math.min(POINTER_INPUT.maximumTailSamples,
      Math.max(2, Math.ceil(distance / Math.max(1, this.#brushSize * 0.12))));
    const previous = this.#beforeOutput ?? output;
    const beforePrevious = this.#twoBeforeOutput ?? previous;
    const tangentX = previous.x - beforePrevious.x;
    const tangentY = previous.y - beforePrevious.y;
    const tangentLength = Math.hypot(tangentX, tangentY);
    const controlDistance = Math.min(distance * 0.5, this.#brushSize);
    const control = tangentLength > 0
      ? { x: output.x + tangentX / tangentLength * controlDistance,
        y: output.y + tangentY / tangentLength * controlDistance }
      : { x: output.x, y: output.y };
    const tail = Array.from({ length: steps }, (_, index) => {
      const progress = (index + 1) / steps;
      const inverse = 1 - progress;
      return { x: inverse * inverse * output.x + 2 * inverse * progress * control.x +
          progress * progress * target.x,
        y: inverse * inverse * output.y + 2 * inverse * progress * control.y +
          progress * progress * target.y,
        pressure: mix(output.pressure, target.pressure, progress),
        tiltX: mix(output.tiltX, target.tiltX, progress),
        tiltY: mix(output.tiltY, target.tiltY, progress), time: target.time };
    });
    this.#beforeOutput = tail.at(-2) ?? output;
    this.#lastOutput = target;
    return tail;
  }

  private positionAlpha(sample: StrokeSample): number {
    const smoothing = Math.min(0.94,
      this.#settings.streamlineAmount * 0.55 +
      this.#settings.stabilizationAmount * 0.35 +
      this.#settings.motionFilteringAmount * 0.55);
    const base = 1 - smoothing;
    const elapsed = Math.max(1, sample.time - (this.#lastRaw?.time ?? sample.time));
    const distance = Math.hypot(sample.x - (this.#lastRaw?.x ?? sample.x),
      sample.y - (this.#lastRaw?.y ?? sample.y));
    const referenceSpeed = 0.15 + this.#brushSize * 0.012;
    const speed = clamp01(distance / elapsed / referenceSpeed);
    const speedBoost = speed * this.#settings.motionFilteringExpression;
    const cornerBoost = this.cornerBoost(sample);
    return timedAlpha(base + (1 - base) * Math.max(speedBoost, cornerBoost), elapsed);
  }

  private cornerBoost(sample: StrokeSample): number {
    if (!this.#beforeRaw || !this.#lastRaw) return 0;
    const ax = this.#lastRaw.x - this.#beforeRaw.x;
    const ay = this.#lastRaw.y - this.#beforeRaw.y;
    const bx = sample.x - this.#lastRaw.x;
    const by = sample.y - this.#lastRaw.y;
    const lengthA = Math.hypot(ax, ay);
    const lengthB = Math.hypot(bx, by);
    if (Math.min(lengthA, lengthB) < Math.max(4, this.#brushSize * 0.25)) return 0;
    const cosine = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (lengthA * lengthB)));
    const turn = Math.acos(cosine) / Math.PI;
    return clamp01(turn * 1.5);
  }
}
