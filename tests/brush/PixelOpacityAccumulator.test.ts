import { describe, expect, it } from "vitest";
import { PixelOpacityAccumulator } from
  "../../src/logic/brush/PixelOpacityAccumulator";

describe("PixelOpacityAccumulator", () => {
  it("combines repeated opacity inside bounded tiles and drains once", () => {
    const pending = new PixelOpacityAccumulator(40, 16);
    pending.add(15, 3, 0.2);
    pending.add(15, 3, 0.3);
    pending.add(16, 18, 1);
    pending.add(39, 18, 0.5);
    const pixels: Array<readonly [number, number, number]> = [];
    pending.drain((x, y, opacity) => pixels.push([x, y, opacity]));
    expect(pixels).toEqual([
      [15, 3, 0.44000000000000006],
      [16, 18, 1],
      [39, 18, 0.5]
    ]);
    expect(pending.size).toBe(0);
  });
});
