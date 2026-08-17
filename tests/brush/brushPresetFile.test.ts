import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import {
  parsePresetFile, presetFileBytes
} from "../../src/core/brush-library/brushPresetFile";
import { sourceAsset } from "../../src/logic/brush/brushSourceAsset";

describe("ProDraw brush preset file", () => {
  it("round trips edited settings without persisting environment paths", () => {
    const base = BUNDLED_BRUSHES[0]!;
    const edited = { ...base, revision: 4, name: "My Ink",
      stabilization: { ...base.stabilization, streamlineAmount: 0.72 },
      taper: { ...base.taper, size: 0.57, opacity: 0.23, tipAnimation: true },
      shape: { ...base.shape, inputStyle: "azimuth" as const, count: 2,
        filtering: "improved" as const },
      grain: { ...base.grain, behavior: "moving" as const, movement: 0.84,
        offsetJitter: true, filtering: "none" as const },
      rendering: { ...base.rendering, mode: "heavy-glaze" as const },
      smudge: { flow: 0.64, pickup: 0.31, pull: 0.91 },
      stylus: { ...base.stylus,
        pressureCurve: [0, 0.18, 0.82, 1] as const,
        barrelAction: "smudge" as const }, properties: { ...base.properties,
        maximumOpacity: 0.92, minimumOpacity: 0.06 },
      preview: { stamp: true, size: 0.74, pressureMinimum: 0.1,
        pressureScale: 1.2, tiltAngle: 0.3 },
      sources: { ...base.sources, shape: sourceAsset(
        { width: 2, height: 2, data: Uint8Array.of(0, 64, 128, 255) }, "Source Ink") } };
    const bytes = presetFileBytes(edited);
    const text = new TextDecoder().decode(bytes);
    expect(text).not.toContain("setName");
    expect(text).not.toContain("sourceUrl");
    const parsed = parsePresetFile(bytes, "Inks", "my-ink.prodraw-brush", base);
    expect(parsed.name).toBe("My Ink");
    expect(parsed.setName).toBe("Inks");
    expect(parsed.stabilization.streamlineAmount).toBe(0.72);
    expect(parsed.taper).toEqual(edited.taper);
    expect(parsed.shape).toEqual(edited.shape);
    expect(parsed.grain).toEqual(edited.grain);
    expect(parsed.rendering.mode).toBe("heavy-glaze");
    expect(parsed.smudge).toEqual({ flow: 0.64, pickup: 0.31, pull: 0.91 });
    expect(parsed.stylus.pressureCurve).toEqual([0, 0.18, 0.82, 1]);
    expect(parsed.stylus.barrelAction).toBe("smudge");
    expect(parsed.properties).toEqual(edited.properties);
    expect(parsed.preview).toEqual(edited.preview);
    expect(parsed.sources.shape?.sourceBrushName).toBe("Source Ink");
  });

  it("clamps numeric input and rejects untrusted stylus actions", () => {
    const base = BUNDLED_BRUSHES[0]!;
    const raw = JSON.parse(new TextDecoder().decode(presetFileBytes(base)));
    raw.strokePath.spacing = 99;
    raw.stylus.barrelAction = "run-command";
    const bytes = new TextEncoder().encode(JSON.stringify(raw));
    const parsed = parsePresetFile(bytes, "Main", "safe.prodraw-brush", base);
    expect(parsed.strokePath.spacing).toBe(4);
    expect(parsed.stylus.barrelAction).toBe("eraser");
  });
});
