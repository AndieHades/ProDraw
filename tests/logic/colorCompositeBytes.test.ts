import { describe, expect, it } from "vitest";
import { sourceOver, sourceOverBytes } from "../../src/logic/raster/colorComposite";

describe("sourceOverBytes", () => {
  it("matches the scalar source-over contract for varying alpha and opacity", () => {
    const colors = [
      { red: 0, green: 0, blue: 0, alpha: 0 },
      { red: 12, green: 80, blue: 220, alpha: 64 },
      { red: 240, green: 30, blue: 90, alpha: 180 },
      { red: 255, green: 255, blue: 255, alpha: 255 }
    ];
    for (const destination of colors) {
      for (const source of colors) {
        for (const opacity of [0, 0.2, 0.75, 1]) {
          const bytes = new Uint8ClampedArray([
            destination.red, destination.green, destination.blue, destination.alpha
          ]);
          sourceOverBytes(bytes, new Uint8ClampedArray([
            source.red, source.green, source.blue, source.alpha
          ]), opacity);
          const expected = sourceOver(destination, source, opacity);
          expect([...bytes]).toEqual([
            expected.red, expected.green, expected.blue, expected.alpha
          ]);
        }
      }
    }
  });
});
