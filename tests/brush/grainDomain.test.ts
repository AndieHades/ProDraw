import { describe, expect, it } from "vitest";
import type { LoadedBrush } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { brushCoverageSampler } from "../../src/logic/brush/brushCoverage";
import { testGrainMap } from "./brushTestMaps";

function loaded(strength: number, scale = 1): LoadedBrush {
  const preset = BUNDLED_BRUSHES[0]!;
  return { ...preset, grain: { ...preset.grain, strength, scale, zoom: 1,
    movement: 0, behavior: "texturized", brightness: 0, contrast: 0,
    filtering: "none" }, shapeMap: null, grainMap: testGrainMap,
    nativeShapeMap: null, nativeGrainMap: testGrainMap,
    compatibility: { archiveVersion: null, archiveName: null,
      supportedFields: [], unsupportedActiveFields: [],
      excludedSections: ["wet-mix", "color-dynamics", "materials"],
      shapeSourceState: "missing", grainSourceState: "resolved",
      missingSourceNames: [] }, warnings: [] };
}

const mean = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;
const variance = (values: readonly number[]): number => {
  const average = mean(values);
  return mean(values.map((value) => (value - average) ** 2));
};

describe("Procreate grain domain", () => {
  it("keeps source detail and moves texture scale into canvas coordinates", () => {
    const fine = brushCoverageSampler(loaded(1, 0.25));
    const broad = brushCoverageSampler(loaded(1, 2));
    expect(testGrainMap.width).toBe(32);
    expect(fine.textureWidth).toBe(290);
    expect(broad.textureWidth).toBe(2320);
    expect([3, 7, 11].map((x) => fine.texture(x, 5))).not.toEqual(
      [3, 7, 11].map((x) => broad.texture(x, 5)));
  });

  it("adds variance around the grain mean without globally fading the stroke", () => {
    const plain = brushCoverageSampler(loaded(0));
    const textured = brushCoverageSampler(loaded(1));
    const step = testGrainMap.scaleReference! / testGrainMap.width;
    const coordinates = Array.from({ length: 32 * 32 }, (_, index) =>
      [(index % 32) * step, Math.floor(index / 32) * step] as const);
    const plainValues = coordinates.map(([x, y]) => plain.texture(x, y));
    const textureValues = coordinates.map(([x, y]) => textured.texture(x, y));
    expect(Math.abs(mean(textureValues) - mean(plainValues))).toBeLessThan(0.05);
    expect(variance(textureValues)).toBeGreaterThan(variance(plainValues) + 0.05);
  });
});
