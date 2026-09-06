import { describe, expect, it } from "vitest";
import { normalizeBitmap } from "../../src/core/psd/psdPixels.ts";

describe("PSD pixel normalization", () => {
  it("reuses an exact 8-bit RGBA buffer instead of doubling import memory", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]);
    const normalized = normalizeBitmap({ width: 2, height: 1, data });
    expect(normalized?.rgba).toBe(data);
  });

  it("converts high-bit-depth channels into a separate 8-bit buffer", () => {
    const data = new Uint16Array([0, 257, 32768, 65535]);
    const normalized = normalizeBitmap({ width: 1, height: 1, data });
    expect(normalized?.rgba).not.toBe(data);
    expect([...normalized!.rgba]).toEqual([0, 1, 128, 255]);
  });
});
