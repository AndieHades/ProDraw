import { describe, expect, it } from "vitest";
import type { BrushPreset } from "../../src/contracts/brush";
import type { StrokeSample } from "../../src/contracts/stroke";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { rasterDabSpacing, StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

const source = BUNDLED_BRUSHES[0]!;
const stable: BrushPreset = { ...source,
  strokePath: { spacing: 0.2, spacingJitter: 0, lateralJitter: 0,
    linearJitter: 0, fallOff: 0, scatter: 0 },
  stabilization: { streamlineAmount: 0, streamlinePressure: 0,
    stabilizationAmount: 0, motionFilteringAmount: 0,
    motionFilteringExpression: 0 },
  taper: { ...source.taper, start: 0, end: 0, pressure: 0 } };
const input: readonly StrokeSample[] = [
  { x: 10, y: 10, pressure: 0.25, tiltX: 0, tiltY: 0, time: 0 },
  { x: 60, y: 10, pressure: 0.5, tiltX: 0, tiltY: 0, time: 10 },
  { x: 120, y: 10, pressure: 0.75, tiltX: 0, tiltY: 0, time: 20 }
];

function run(brush: BrushPreset): readonly StrokeSample[] {
  const pipeline = new StrokePipeline(brush, 20);
  return [...input.flatMap((sample) => pipeline.push(sample)), ...pipeline.finish()];
}

describe("StrokePipeline brush dynamics", () => {
  it("bounds production .01 spacing to a continuous raster-safe sample count", () => {
    expect(rasterDabSpacing(24, 0.01)).toBe(1);
    expect(rasterDabSpacing(148, 0.01)).toBeCloseTo(1.48);
    const dense = { ...stable, strokePath: { ...stable.strokePath, spacing: 0.01 } };
    const pipeline = new StrokePipeline(dense, 24);
    const first = { ...input[0]!, x: 0, y: 0 };
    const second = { ...input[0]!, x: 40, y: 0, time: 1 };
    const plan = [...pipeline.push(first), ...pipeline.push(second)];
    expect(plan.length).toBeGreaterThanOrEqual(40);
    expect(plan.length).toBeLessThanOrEqual(42);
  });
  it("plans jitter and scatter deterministically", () => {
    const dynamic = { ...stable, strokePath: { ...stable.strokePath,
      spacingJitter: 0.8, lateralJitter: 0.7, linearJitter: 0.6, scatter: 0.5 } };
    expect(run(dynamic)).toEqual(run(dynamic));
    expect(run(dynamic)).not.toEqual(run(stable));
    for (const [key, value] of [["spacingJitter", 0.8], ["lateralJitter", 0.7],
      ["linearJitter", 0.6]] as const) {
      const variant = { ...stable, strokePath: { ...stable.strokePath, [key]: value } };
      expect(run(variant), key).not.toEqual(run(stable));
    }
  });

  it("makes spacing and falloff affect generated samples", () => {
    const sparse = { ...stable, strokePath: { ...stable.strokePath, spacing: 1 } };
    expect(run(sparse).length).toBeLessThan(run(stable).length);
    const fading = { ...stable, strokePath: { ...stable.strokePath, fallOff: 0.9 } };
    expect(run(fading).at(-1)!.pressure).toBeLessThan(run(stable).at(-1)!.pressure);
  });

  it("makes start, end, and pressure taper affect size and opacity plans", () => {
    const tapered = { ...stable, taper: { ...stable.taper,
      start: 1, end: 0.8, pressure: 0, size: 1, opacity: 1 } };
    const pressureTaper = { ...tapered, taper: { ...tapered.taper, pressure: 1 } };
    expect(run(tapered)[0]!.sizeScale).toBeLessThan(run(stable)[0]!.sizeScale!);
    expect(run(tapered).at(-1)!.opacityScale).toBeLessThan(
      run(stable).at(-1)!.opacityScale!);
    expect(run(pressureTaper)[0]!.sizeScale).toBeGreaterThan(
      run(tapered)[0]!.sizeScale!);
  });
});
