import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import {
  parsePresetFile, presetFileBytes
} from "../../src/core/brush-library/brushPresetFile";

describe("ProDraw brush preset file", () => {
  it("round trips edited settings without persisting environment paths", () => {
    const base = BUNDLED_BRUSHES[0]!;
    const edited = { ...base, revision: 4, name: "My Ink",
      stabilization: { ...base.stabilization, streamlineAmount: 0.72 },
      stylus: { ...base.stylus,
        pressureCurve: [0, 0.18, 0.82, 1] as const,
        barrelAction: "smudge" as const } };
    const bytes = presetFileBytes(edited);
    const text = new TextDecoder().decode(bytes);
    expect(text).not.toContain("setName");
    expect(text).not.toContain("sourceUrl");
    const parsed = parsePresetFile(bytes, "Inks", "my-ink.prodraw-brush", base);
    expect(parsed.name).toBe("My Ink");
    expect(parsed.setName).toBe("Inks");
    expect(parsed.stabilization.streamlineAmount).toBe(0.72);
    expect(parsed.stylus.pressureCurve).toEqual([0, 0.18, 0.82, 1]);
    expect(parsed.stylus.barrelAction).toBe("smudge");
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
