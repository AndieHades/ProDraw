import { describe, expect, it } from "vitest";
import { PixelOpacityAccumulator } from
  "../../src/logic/brush/PixelOpacityAccumulator";

describe("PixelOpacityAccumulator", () => {
  it("keeps maximum stroke coverage and exposes dirty previews", () => {
    const pending = new PixelOpacityAccumulator(40, 16);
    pending.add(15, 3, 0.2);
    pending.add(15, 3, 0.3);
    pending.add(16, 18, 1);
    pending.add(39, 18, 0.5);
    const pixels: Array<readonly [number, number, number]> = [];
    pending.visitDirty((x, y, opacity) => pixels.push([x, y, opacity]));
    expect(pixels).toEqual([
      [15, 3, 0.3],
      [16, 18, 1],
      [39, 18, 0.5]
    ]);
    expect(pending.size).toBe(3);
    expect(() => pending.visitDirty(() => { throw new Error("clean"); })).not.toThrow();
    pending.drain(() => undefined); expect(pending.size).toBe(0);
  });
});
