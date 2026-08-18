import { describe, expect, it } from "vitest";
import type { BrushPreset, LoadedBrush } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { pressureBrushSize } from "../../src/core/brush/renderBrushDab";
import { brushTexture, brushTipCoverage } from "../../src/logic/brush/brushCoverage";
import { testGrainMap } from "./brushTestMaps";

const source = BUNDLED_BRUSHES[0]!;
const brush = (patch: Partial<BrushPreset>): BrushPreset => ({ ...source, ...patch });

const textured = (preset: BrushPreset): LoadedBrush => ({ ...preset,
  shapeMap: null, grainMap: testGrainMap, nativeShapeMap: null,
  nativeGrainMap: testGrainMap,
  compatibility: { archiveVersion: null, archiveName: null, supportedFields: [],
    unsupportedActiveFields: [], excludedSections: ["wet-mix", "color-dynamics", "materials"],
    shapeSourceState: "missing", grainSourceState: "resolved", missingSourceNames: [] },
  warnings: [] });

describe("brush coverage controls", () => {
  it("applies hardness, roundness, and shape angle to the tip", () => {
    const hard = brush({ shape: { ...source.shape, hardness: 1, angle: 0, roundness: 1 } });
    const soft = brush({ shape: { ...source.shape, hardness: 0, angle: 0, roundness: 1 } });
    expect(brushTipCoverage(hard, 0.7, 0)).toBeGreaterThan(
      brushTipCoverage(soft, 0.7, 0));

    const narrow = brush({ shape: { ...source.shape, hardness: 1,
      angle: 0, roundness: 0.2 } });
    const rotated = brush({ shape: { ...source.shape, hardness: 1,
      angle: Math.PI / 2, roundness: 0.2 } });
    expect(brushTipCoverage(narrow, 0, 0.7)).toBe(0);
    expect(brushTipCoverage(rotated, 0, 0.7)).toBeGreaterThan(0);
  });

  it("keeps unsupported built-in tips smooth instead of inventing square geometry", () => {
    const round = brush({ shape: { ...source.shape, hardness: 1, angle: 0, roundness: 1,
      sourceName: "Brush-Preset-Hard.png" } });
    const brick = brush({ shape: { ...source.shape, hardness: 1, angle: 0, roundness: 1,
      sourceName: "Brush-Pocket-Brick.png" } });
    expect(brushTipCoverage(round, 0.8, 0.8)).toBe(0);
    expect(brushTipCoverage(brick, 0.8, 0.8)).toBe(0);
    expect(brushTipCoverage(brick, 0.8, 0)).toBeGreaterThan(0);
  });

  it("uses grain scale to change texture sampling", () => {
    const fine = textured(brush({ grain: { ...source.grain, strength: 1, scale: 0.2 } }));
    const broad = textured(brush({ grain: { ...source.grain, strength: 1, scale: 5 } }));
    const samples = [[3, 7], [11, 5], [17, 23]] as const;
    expect(samples.map(([x, y]) => brushTexture(fine, x, y))).not.toEqual(
      samples.map(([x, y]) => brushTexture(broad, x, y)));
  });

  it("clamps size and responds to Huion pressure and tilt", () => {
    const responsive = brush({
      dynamics: { sizeByPressure: 1, opacityByPressure: 0, tiltToSize: 1 },
      properties: { ...source.properties, minimumSize: 5, maximumSize: 30 }
    });
    expect(pressureBrushSize(responsive, 20,
      { pressure: 0, tiltX: 0, tiltY: 0 })).toBe(5);
    expect(pressureBrushSize(responsive, 20,
      { pressure: 1, tiltX: 90, tiltY: 0 })).toBe(30);
  });
});
