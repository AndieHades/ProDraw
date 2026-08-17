import { describe, expect, it } from "vitest";
import { CANVAS_PRESETS, validateCanvasSize } from "../../src/config/canvasPresets";
import { en } from "../../src/i18n/raster/en";
import { ru } from "../../src/i18n/raster/ru";

describe("canvas presets", () => {
  it("contains the exact required screen, print and social dimensions", () => {
    const dimensions = new Set(CANVAS_PRESETS.map(({ width, height, dpi }) =>
      `${width}x${height}@${dpi}`));
    for (const expected of [
      "1920x1080@72", "1920x1200@72", "2560x1440@72", "2560x1600@72",
      "3840x2160@72", "1748x2480@300", "2480x1748@300", "2480x3508@300",
      "3508x2480@300", "1080x1080@72", "1080x1440@72", "1080x1920@72",
      "2048x2048@72", "4096x4096@72"
    ]) expect(dimensions).toContain(expected);
  });

  it("rejects invalid sides and documents beyond the pixel budget", () => {
    expect(validateCanvasSize(4096, 4096).valid).toBe(true);
    expect(validateCanvasSize(8192, 8192).reason).toBe("pixels");
    expect(validateCanvasSize(8193, 100).reason).toBe("side");
    expect(validateCanvasSize(8192, 8193).reason).toBe("side");
    expect(validateCanvasSize(8192, 8192.5).reason).toBe("side");
  });

  it("resolves every built-in label in Russian and English", () => {
    for (const preset of CANVAS_PRESETS) {
      const key = preset.labelKey as keyof typeof ru;
      expect(ru[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
    }
  });

  it("keeps A4 larger than A5 in both orientations", () => {
    const area = (id: string): number => {
      const preset = CANVAS_PRESETS.find((candidate) => candidate.id === id);
      if (!preset) throw new Error(`Missing preset ${id}`);
      return preset.width * preset.height;
    };
    expect(area("a4-p")).toBeGreaterThan(area("a5-p"));
    expect(area("a4-l")).toBeGreaterThan(area("a5-l"));
  });
});
