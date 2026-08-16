import type { BrushStabilization } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const mix = (left: number, right: number, amount: number): number =>
  left + (right - left) * amount;

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
    const pressureAlpha = Math.max(0.04, 1 -
      this.#settings.streamlinePressure * 0.86 -
      this.#settings.motionFilteringAmount * 0.1);
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
    this.#lastOutput = output;
    return [output];
  }

  finish(): readonly StrokeSample[] {
    const target = this.#lastRaw;
    const output = this.#lastOutput;
    if (!target || !output || sameSample(target, output)) return [];
    this.#lastOutput = target;
    return [target];
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
    return clamp01(base + (1 - base) * Math.max(speedBoost, cornerBoost));
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
