import { describe, expect, it } from "vitest";
import { readPngDpi, setPngDpi } from "../../src/logic/png/pngDpi";

const onePixelPng = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
  8, 6, 0, 0, 0, 31, 21, 196, 137,
  0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
]);

describe("PNG DPI metadata", () => {
  it("inserts a standards-based pHYs chunk without changing image dimensions", () => {
    const png = setPngDpi(onePixelPng, 300);
    expect(readPngDpi(png)).toBe(300);
    expect(png.slice(0, 33)).toEqual(onePixelPng.slice(0, 33));
    expect(png.slice(-12)).toEqual(onePixelPng.slice(-12));
  });

  it("rejects non-PNG bytes", () => {
    expect(() => setPngDpi(new Uint8Array([1, 2, 3]), 72)).toThrow("Not a PNG");
  });
});
