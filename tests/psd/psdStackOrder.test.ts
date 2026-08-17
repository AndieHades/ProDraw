import { describe, expect, it } from "vitest";
import type { PsdImportBitmap, PsdImportLayer } from
  "../../src/contracts/psdImport.ts";
import { inferPsdStackOrder } from "../../src/logic/psd/inferStackOrder.ts";

const bitmap = (rgba: readonly number[]): PsdImportBitmap => ({
  left: 0, top: 0, width: 4, height: 4,
  rgba: new Uint8ClampedArray(Array.from({ length: 16 }, () => rgba).flat()),
});

const layer = (name: string, value: PsdImportBitmap): PsdImportLayer => ({
  kind: "layer", name, visible: true, opacity: 1, blendMode: "normal",
  effects: [], bitmap: value, masks: [], clipping: false, locked: false,
  alphaLocked: false,
});

describe("PSD stack order inference", () => {
  it("distinguishes documented top-first and producer-specific bottom-first trees", () => {
    const red = bitmap([255, 0, 0, 255]), blue = bitmap([0, 0, 255, 255]);
    const top = layer("Top", red), bottom = layer("Bottom", blue);
    expect(inferPsdStackOrder([top, bottom], red)).toBe("top-first");
    expect(inferPsdStackOrder([bottom, top], red)).toBe("bottom-first");
  });

  it("uses the documented order when composite evidence is unavailable", () => {
    const red = bitmap([255, 0, 0, 255]);
    expect(inferPsdStackOrder([layer("Only", red)], red)).toBe("top-first");
    expect(inferPsdStackOrder([], undefined)).toBe("top-first");
  });
});
