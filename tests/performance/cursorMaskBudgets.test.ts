import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { PERFORMANCE_BUDGETS } from "../../src/config/performance";
import type { LoadedBrush } from "../../src/contracts/brush";
import { brushCursorMask } from "../../src/core/brush/brushCursorMask";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush";
import { alphaContour } from "../../src/logic/brush/alphaContour";

function fixture(): LoadedBrush {
  const brush = BUNDLED_BRUSHES.find(({ name }) => name === "Big Soft Brush");
  if (!brush) throw new Error("Big Soft Brush fixture is unavailable");
  return { ...brush, shapeMap: null, grainMap: null,
    nativeShapeMap: null, nativeGrainMap: null,
    compatibility: emptyBrushCompatibility(), warnings: [] };
}

describe("brush cursor budgets", () => {
  it("keeps a 500px cursor below one presentation frame", () => {
    const brush = fixture(), durations: number[] = [];
    brushCursorMask(brush, 500,
      { x: 250, y: 250, pressure: 1, tiltX: 0, tiltY: 0, time: 0 });
    for (let index = 0; index < 12; index += 1) {
      const started = performance.now();
      const mask = brushCursorMask(brush, 500,
        { x: 250 + index, y: 250, pressure: 1, tiltX: 0, tiltY: 0, time: index });
      alphaContour(mask, 12); durations.push(performance.now() - started);
    }
    durations.sort((left, right) => left - right);
    expect(durations[11]).toBeLessThan(
      PERFORMANCE_BUDGETS.inputToPresentP95Milliseconds);
  });
});
