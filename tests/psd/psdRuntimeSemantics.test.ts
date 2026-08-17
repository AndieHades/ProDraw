import { describe, expect, it } from "vitest";
import type { PsdBlendMode, PsdImportMask } from "../../src/contracts/psdImport";
import { blendPixel } from "../../src/logic/psd/blendMode";
import { psdMaskField } from "../../src/logic/psd/maskAlpha";

const MODES: readonly PsdBlendMode[] = [
  "pass through", "normal", "dissolve", "darken", "multiply", "color burn",
  "linear burn", "darker color", "lighten", "screen", "color dodge",
  "linear dodge", "lighter color", "overlay", "soft light", "hard light",
  "vivid light", "linear light", "pin light", "hard mix", "difference",
  "exclusion", "subtract", "divide", "hue", "saturation", "color",
  "luminosity", "linear height", "height", "subtraction",
];

describe("PSD blend modes", () => {
  it.each(MODES)("composites %s without falling outside RGBA", (mode) => {
    const result = blendPixel([201, 93, 47, 191], [37, 181, 223, 129], 0.73,
      mode, 17, 29);
    expect(result).toHaveLength(4);
    expect(result.every((value) => Number.isInteger(value) && value >= 0 && value <= 255))
      .toBe(true);
    expect(blendPixel([201, 93, 47, 191], [37, 181, 223, 129], 0.73,
      mode, 17, 29)).toEqual(result);
  });

  it("keeps alpha math and non-native families explicit", () => {
    expect(blendPixel([200, 100, 50, 255], [100, 150, 200, 255], 1, "multiply"))
      .toEqual([78, 59, 39, 255]);
    expect(blendPixel([200, 100, 50, 255], [100, 150, 200, 255], 1,
      "linear light")).toEqual([145, 145, 195, 255]);
    expect(blendPixel([0, 0, 0, 0], [12, 34, 56, 1], 1, "normal"))
      .toEqual([12, 34, 56, 1]);
  });
});

describe("PSD mask and overlay semantics", () => {
  it("applies byte alpha, density and relative mask coordinates", () => {
    const mask: PsdImportMask = { source: "user", left: 0, top: 0,
      width: 2, height: 2, defaultAlpha: 255, disabled: false,
      relativeToLayer: true, rasterizedVector: false, density: 0.5, feather: 0,
      alpha: new Uint8Array([0, 64, 128, 255]) };
    expect([...psdMaskField(mask, { minx: 4, miny: 5, maxx: 5, maxy: 6 },
      { left: 4, top: 5 })]).toEqual([128, 160, 192, 255]);
  });

});
