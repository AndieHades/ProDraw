import { describe, expect, it } from "vitest";
import { logicalGrainTile } from "../../src/logic/brush/grainTile";

describe("Procreate logical grain tile", () => {
  it("uses native 2048px source and textureScale divided by sixteen", () => {
    const source = { width: 2048, height: 2048,
      data: new Uint8Array(2048 * 2048) };
    expect(logicalGrainTile(source, 0.0893198549747467)).toMatchObject({
      width: 11, height: 11
    });
    expect(logicalGrainTile(source, 0.1845310479402542)).toMatchObject({
      width: 24, height: 24
    });
  });

  it("area-filters source pixels instead of dropping thin texture", () => {
    const source = { width: 4, height: 4, data: Uint8Array.from([
      255, 0, 255, 0, 255, 0, 255, 0,
      0, 255, 0, 255, 0, 255, 0, 255
    ]) };
    const tile = logicalGrainTile(source, 8);
    expect(tile.width).toBe(2); expect(tile.height).toBe(2);
    expect([...tile.data]).toEqual([128, 128, 128, 128]);
  });
});
