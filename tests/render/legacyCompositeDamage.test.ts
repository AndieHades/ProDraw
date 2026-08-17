import { describe, expect, it } from "vitest";
import { LegacyCompositeDamageTracker, isIncrementalCompositeSafe } from
  "../../src/core/render/LegacyCompositeDamage";

const simpleState = () => ({
  layers: [{ kind: "pixel", fid: null, clip: false, effects: [], ext: new Map() }],
  folders: []
});

describe("legacy composite damage", () => {
  it("keeps a sparse A4 stroke bounded to its union instead of the canvas", () => {
    const tracker = new LegacyCompositeDamageTracker();
    expect(tracker.take(2480, 3508)).toEqual({ kind: "full" });
    tracker.noteLayer(0, { minx: 1200, miny: 1700, maxx: 1231, maxy: 1731 });
    tracker.noteLayer(0, { minx: 1220, miny: 1720, maxx: 1251, maxy: 1751 });

    const damage = tracker.take(2480, 3508);
    expect(damage).toEqual({ kind: "region",
      bounds: { minx: 1200, miny: 1700, maxx: 1251, maxy: 1751 },
      layerIndexes: [0] });
    if (damage?.kind !== "region") throw new Error("Expected bounded damage");
    const area = (damage.bounds.maxx - damage.bounds.minx + 1) *
      (damage.bounds.maxy - damage.bounds.miny + 1);
    expect(area).toBe(2_704);
    expect(area).toBeLessThan(2480 * 3508 / 1_000);
    expect(isIncrementalCompositeSafe(simpleState(), damage)).toBe(true);
  });

  it("forces full fallback for unbounded edits and complex stacks", () => {
    const tracker = new LegacyCompositeDamageTracker(); tracker.take(64, 64);
    tracker.noteLayer(0, { minx: -4, miny: 2, maxx: 70, maxy: 8 });
    const damage = tracker.take(64, 64);
    expect(damage).toEqual({ kind: "region",
      bounds: { minx: 0, miny: 2, maxx: 63, maxy: 8 }, layerIndexes: [0] });
    expect(isIncrementalCompositeSafe({ ...simpleState(), folders: [{}] }, damage)).toBe(false);
    expect(isIncrementalCompositeSafe({ ...simpleState(),
      layers: [{ ...simpleState().layers[0], effects: [{}] }] }, damage)).toBe(false);

    tracker.noteLayer(0);
    expect(tracker.take(2480, 3508)).toEqual({ kind: "full" });
  });
});
