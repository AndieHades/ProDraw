import { describe, expect, it } from "vitest";
import { coveragePixels } from "../../src/core/brush/decodeCoverage";

describe("Procreate source polarity", () => {
  it("honors shape and grain inversion exported by Brush.archive", () => {
    const rgba = new Uint8ClampedArray([
      255, 255, 255, 255,
      0, 0, 0, 255,
      120, 120, 120, 128
    ]);
    expect([...coveragePixels(rgba)]).toEqual([255, 0, 60]);
    expect([...coveragePixels(rgba, { inverted: true })]).toEqual([0, 255, 68]);
  });

  it("applies exported texture contrast without changing polarity", () => {
    const rgba = new Uint8ClampedArray([
      96, 96, 96, 255,
      160, 160, 160, 255
    ]);
    const normal = coveragePixels(rgba);
    const contrasted = coveragePixels(rgba, { contrast: 0.5 });
    expect(contrasted[0]).toBeLessThan(normal[0]!);
    expect(contrasted[1]).toBeGreaterThan(normal[1]!);
  });

  it("applies the exported texture brightness offset", () => {
    const rgba = new Uint8ClampedArray([128, 128, 128, 255]);
    expect(coveragePixels(rgba, { brightness: -0.1 })[0]).toBeLessThan(128);
    expect(coveragePixels(rgba, { brightness: 0.1 })[0]).toBeGreaterThan(128);
  });
});
