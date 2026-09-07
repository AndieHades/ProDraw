import { describe, expect, it } from "vitest";
import { brushPreviewCoverage,
  brushPreviewPixels } from "../../src/systems/draw/brush-preview.ts";

const size = { width: 64, height: 64 };
const painted = (coverage: Float32Array): number =>
  coverage.reduce((count, value) => value > 0 ? count + 1 : count, 0);

describe("brush preview", () => {
  // Плитка показывала первую букву имени; превью должно быть настоящим мазком.
  it("draws a stroke that fits inside the tile", () => {
    const coverage = brushPreviewCoverage(size);
    expect(painted(coverage)).toBeGreaterThan(200);
    for (let x = 0; x < size.width; x++) {
      expect(coverage[x]).toBe(0);
      expect(coverage[(size.height - 1) * size.width + x]).toBe(0);
    }
  });

  it("distinguishes the square tip from the round one", () => {
    const round = brushPreviewCoverage(size);
    const square = brushPreviewCoverage({ ...size, square: true });
    expect(painted(square)).not.toBe(painted(round));
  });

  it("paints the requested colour with coverage as alpha", () => {
    const pixels = brushPreviewPixels(size, [10, 200, 30]);
    const opaque = [];
    for (let index = 0; index < pixels.length; index += 4) {
      if ((pixels[index + 3] ?? 0) > 0) opaque.push(index);
    }
    expect(opaque.length).toBeGreaterThan(200);
    const first = opaque[0] ?? 0;
    expect([pixels[first], pixels[first + 1], pixels[first + 2]]).toEqual([10, 200, 30]);
  });
});
