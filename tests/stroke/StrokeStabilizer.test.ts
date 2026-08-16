import { describe, expect, it } from "vitest";
import type { BrushStabilization } from "../../src/contracts/brush";
import type { StrokeSample } from "../../src/contracts/stroke";
import { StrokeStabilizer } from "../../src/logic/stroke/StrokeStabilizer";
import { calibratedPressure } from "../../src/logic/stroke/pressureResponse";

const settings: BrushStabilization = {
  streamlineAmount: 0.8, streamlinePressure: 0.7,
  stabilizationAmount: 0.7, motionFilteringAmount: 0.8,
  motionFilteringExpression: 0
};
const sample = (x: number, y: number, time: number, pressure = 0.5): StrokeSample =>
  ({ x, y, time, pressure, tiltX: 0, tiltY: 0 });

describe("StrokeStabilizer", () => {
  it("reduces hand jitter while flushing the exact endpoint", () => {
    const stabilizer = new StrokeStabilizer(settings, 24);
    const raw = Array.from({ length: 20 }, (_, index) =>
      sample(index * 3, index % 2 ? 1.5 : -1.5, index * 8));
    const output = raw.flatMap((point) => stabilizer.push(point));
    const variation = (points: readonly StrokeSample[]) => points.slice(1).reduce(
      (sum, point, index) => sum + Math.abs(point.y - points[index]!.y), 0);
    const rawNoise = variation(raw);
    const filteredNoise = variation(output);
    expect(filteredNoise).toBeLessThan(rawNoise * 0.5);
    expect(stabilizer.finish()[0]).toEqual(raw.at(-1));
  });

  it("does not swallow a dot and retains a deliberate corner", () => {
    const stabilizer = new StrokeStabilizer(settings, 20);
    expect(stabilizer.push(sample(4, 5, 0))).toHaveLength(1);
    stabilizer.push(sample(34, 5, 16));
    const corner = stabilizer.push(sample(34, 35, 32))[0]!;
    expect(corner.y).toBeGreaterThan(25);
  });

  it("applies minimum pressure and a monotonic four-point curve", () => {
    const stylus = { minimumPressure: 0.1, pressureCurve: [0, 0.2, 0.8, 1] as const,
      tiltEnabled: true, barrelAction: "eraser" as const, eraserAction: "eraser" as const };
    expect(calibratedPressure(0.05, stylus)).toBe(0);
    expect(calibratedPressure(0.55, stylus)).toBeCloseTo(0.5, 4);
    expect(calibratedPressure(1, stylus)).toBe(1);
  });
});
