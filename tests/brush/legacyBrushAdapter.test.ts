import { describe, expect, it } from "vitest";
import type { LoadedBrush } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { legacyBrushStamp } from "../../src/logic/brush/legacyBrushAdapter";
import { testGrainMap } from "./brushTestMaps";

const loaded = (index: number): LoadedBrush => ({ ...BUNDLED_BRUSHES[index]!,
  grain: { ...BUNDLED_BRUSHES[index]!.grain,
    scale: index % 2 === 0 ? 5 : BUNDLED_BRUSHES[index]!.grain.scale },
  shapeMap: null, grainMap: index % 2 === 0 ? testGrainMap : null,
  nativeShapeMap: null, nativeGrainMap: index % 2 === 0 ? testGrainMap : null,
  compatibility: { archiveVersion: null, archiveName: null, supportedFields: [],
    unsupportedActiveFields: [],
    excludedSections: ["wet-mix", "color-dynamics", "materials"],
    shapeSourceState: "missing", grainSourceState: index % 2 === 0 ? "resolved" : "missing",
    missingSourceNames: [] }, warnings: [] });

describe("typed brush adapter for the preserved canvas", () => {
  it("keeps preset opacity, spacing and scatter differences", () => {
    const stamps = BUNDLED_BRUSHES.map((_brush, index) => legacyBrushStamp(loaded(index)));
    expect(new Set(stamps.map(({ opacity }) => opacity)).size).toBeGreaterThan(3);
    expect(new Set(stamps.map(({ params }) => params.spacing)).size).toBeGreaterThan(3);
    expect(stamps.some(({ params }) => params.mode === "scatter")).toBe(true);
  });

  it("produces visibly different tip and grain masks", () => {
    const stamps = BUNDLED_BRUSHES.map((_brush, index) => legacyBrushStamp(loaded(index)));
    const coverageTotals = stamps.map(({ coverage }) =>
      coverage.data.reduce((sum, value) => sum + value, 0));
    expect(new Set(coverageTotals).size).toBeGreaterThan(3);
    expect(stamps.some(({ grain }) => grain !== null)).toBe(true);
    expect(stamps.some(({ grain }) => grain === null)).toBe(true);
  });

  it("reuses the calculated masks for the same immutable loaded brush", () => {
    const brush = loaded(0);
    expect(legacyBrushStamp(brush)).toBe(legacyBrushStamp(brush));
    expect(legacyBrushStamp(loaded(0))).not.toBe(legacyBrushStamp(brush));
  });
});
