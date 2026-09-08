import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes.ts";
import { LiveBrushPreferences } from "../../src/core/brush/LiveBrushPreferences.ts";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush.ts";
import { LIVE_BRUSH_STORE } from "../../src/config/liveBrushControls.ts";

const source = { ...BUNDLED_BRUSHES[0]!, shapeMap: { width: 1, height: 1, data: Uint8Array.of(255) },
  grainMap: null, nativeShapeMap: null, nativeGrainMap: null,
  compatibility: emptyBrushCompatibility(), warnings: [] };
const fixture = () => {
  const data = new Map<string, string>();
  const storage = () => ({ getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); } });
  return { data, storage, prefs: new LiveBrushPreferences(storage) };
};

describe("live brush properties", () => {
  it("persists supported controls and reuses immutable decoded sources", () => {
    const { prefs, storage } = fixture();
    prefs.update("preset:lineart", { size: 18, opacity: 0.7,
      values: { "strokePath.spacing": 0.15, "shape.angle": 90, "stylus.pressureCurve.1": 0.5 } });
    const restored = new LiveBrushPreferences(storage);
    const brush = restored.brush("preset:lineart", source);
    expect(brush.strokePath.spacing).toBe(0.15);
    expect(brush.shape.angle).toBeCloseTo(Math.PI / 2);
    expect(brush.stylus.pressureCurve[1]).toBe(0.5);
    expect(source.stylus.pressureCurve[1]).toBe(0.33);
    expect(brush.shapeMap).toBe(source.shapeMap);
    expect(restored.get("preset:lineart")).toMatchObject({ size: 18, opacity: 0.7 });
    expect(restored.brush("preset:lineart", source)).toBe(brush);
  });

  it("keeps copies independent and resets to archive defaults", () => {
    const { prefs } = fixture();
    prefs.update("preset:lineart", { values: { "rendering.flow": 0.5 } });
    prefs.copy("preset:lineart", "user:copy");
    prefs.update("user:copy", { values: { "rendering.flow": 0.2 } });
    expect(prefs.brush("preset:lineart", source).rendering.flow).toBe(0.5);
    expect(prefs.brush("user:copy", source).rendering.flow).toBe(0.2);
    prefs.reset("user:copy"); expect(prefs.brush("user:copy", source)).toBe(source);
  });

  it("isolates corrupt entries, unknown paths and invalid values", () => {
    const { data, storage } = fixture();
    data.set(LIVE_BRUSH_STORE, JSON.stringify({ version: 1, entries: { bad: null,
      good: { values: { "strokePath.spacing": 0.1, "shape.inputStyle": "invalid",
        "shape.count": 9999, "__proto__.polluted": true, "rendering.flow": "bad" } } } }));
    const prefs = new LiveBrushPreferences(storage);
    expect(prefs.brush("bad", source)).toBe(source);
    const brush = prefs.brush("good", source);
    expect(brush.strokePath.spacing).toBe(0.1);
    expect(brush.shape.count).toBe(16);
    expect(brush.shape.inputStyle).toBe(source.shape.inputStyle);
    expect(brush.rendering.flow).toBe(source.rendering.flow);
  });
});
