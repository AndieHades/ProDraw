import { describe, expect, it } from "vitest";
import type { BrushPreset } from "../../src/contracts/brush";
import type { StrokeSample } from "../../src/contracts/stroke";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

const source = BUNDLED_BRUSHES[0]!;
const flat = (overrides: Partial<BrushPreset["shape"]> = {},
  properties: Partial<BrushPreset["properties"]> = {}): BrushPreset => ({ ...source,
  strokePath: { spacing: 0.4, spacingJitter: 0, lateralJitter: 0, linearJitter: 0,
    fallOff: 0, scatter: 0 },
  stabilization: { streamlineAmount: 0, streamlinePressure: 0,
    stabilizationAmount: 0, motionFilteringAmount: 0, motionFilteringExpression: 0 },
  taper: { ...source.taper, start: 0, end: 0, pressure: 0 },
  // Вытянутый отпечаток с нулевым `rotation` — случай, где раньше поворот терялся.
  shape: { ...source.shape, roundness: 0.25, rotation: 0, relativeToStroke: false,
    inputStyle: "touch", ...overrides },
  properties: { ...source.properties, ...properties } });

const along = (brush: BrushPreset, dx: number, dy: number): readonly StrokeSample[] => {
  const pipeline = new StrokePipeline(brush, 20);
  const points: StrokeSample[] = [];
  for (let step = 0; step <= 4; step++) points.push({ x: 10 + dx * step,
    y: 10 + dy * step, pressure: 0.6, tiltX: 0, tiltY: 0, time: step * 8 });
  points.forEach((sample) => pipeline.push(sample)); pipeline.finish();
  return pipeline.completedPlan();
};

const settled = (plan: readonly StrokeSample[]): number => plan.at(-1)?.rotation ?? NaN;

describe("dab orientation", () => {
  it("turns the stamp with the direction of travel", () => {
    expect(settled(along(flat(), 20, 0))).toBeCloseTo(0, 5);
    expect(settled(along(flat(), 0, 20))).toBeCloseTo(Math.PI / 2, 5);
    expect(settled(along(flat(), -20, 0))).toBeCloseTo(Math.PI, 5);
  });

  it("keeps a screen oriented preset unturned", () => {
    expect(settled(along(flat({}, { orientToScreen: true }), 0, 20))).toBe(0);
  });

  it("follows stylus azimuth when the preset asks for it", () => {
    const brush = flat({ inputStyle: "azimuth" });
    const pipeline = new StrokePipeline(brush, 20);
    for (let step = 0; step <= 4; step++) pipeline.push({ x: 10 + step * 20, y: 10,
      pressure: 0.6, tiltX: 0, tiltY: 40, time: step * 8 });
    pipeline.finish();
    expect(settled(pipeline.completedPlan())).toBeCloseTo(Math.PI / 2, 5);
  });
});
