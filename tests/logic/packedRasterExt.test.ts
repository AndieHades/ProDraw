import { describe, expect, it, vi } from "vitest";
import { PackedRasterExt, cloneRasterExt, hydrateRasterExt,
  serializeRasterExt } from "../../src/logic/raster/PackedRasterExt.ts";
import { copyRasterExt, rasterExtBounds } from "../../src/logic/raster/rasterExtRegion.ts";

const fixture = () => {
  const ext = new PackedRasterExt();
  ext.addRow({ y: -2, left: -3, opaquePixels: 2,
    bytes: new Uint8ClampedArray([10, 20, 30, 128, 0, 0, 0, 0, 40, 50, 60, 255]) });
  ext.set("8,9", [70, 80, 90]);
  return ext;
};

describe("compact off-canvas RGBA", () => {
  it("keeps Map reads, updates during iteration, deletion and clear usable", () => {
    const ext = fixture();
    expect(ext.size).toBe(3); expect(ext.has("-2,-2")).toBe(false);
    expect(ext.get("-3,-2")).toEqual([10, 20, 30, 128]);
    let updates = 0;
    for (const [key, value] of ext) {
      ext.set(key, [(value[0] ?? 0) + 1, ...value.slice(1)]); updates++;
      if (updates > 3) throw new Error("iteration revisited an updated pixel");
    }
    expect(updates).toBe(3);
    expect([...ext.keys()]).toEqual(["-3,-2", "-1,-2", "8,9"]);
    expect([...ext.values()][0]).toEqual([11, 20, 30, 128]);
    expect(ext.delete("-3,-2")).toBe(true);
    expect(ext.delete("-3,-2")).toBe(false);
    expect(ext.size).toBe(2);
    const visited: string[] = []; ext.forEach((_, key) => visited.push(key));
    expect(visited).toEqual(["-1,-2", "8,9"]);
    ext.clear(); expect([...ext]).toEqual([]); expect(ext.size).toBe(0);
  });

  it("clones independently and survives explicit structured serialization", () => {
    const original = fixture(), clone = cloneRasterExt(original);
    const reopened = hydrateRasterExt(structuredClone(serializeRasterExt(original)));
    expect([...clone]).toEqual([...original]); expect([...reopened]).toEqual([...original]);
    clone.set("-3,-2", [1, 2, 3, 4]); reopened.delete("-1,-2");
    expect(original.get("-3,-2")).toEqual([10, 20, 30, 128]);
    expect(original.has("-1,-2")).toBe(true);
    expect(hydrateRasterExt(new Map([["0,0", [1, 2, 3]]])).get("0,0")).toEqual([1, 2, 3]);
    expect(() => hydrateRasterExt({ format: "rgba-ext-rows-v2" })).toThrow();
    expect(() => hydrateRasterExt({ format: "rgba-ext-rows-v1", rows: [] })).toThrow();
  });

  it("finds bounds and copies clipped preview spans without enumerating pixel entries", () => {
    const ext = fixture();
    vi.spyOn(ext, Symbol.iterator).mockImplementation(() => { throw new Error("pixel scan"); });
    expect(rasterExtBounds(ext)).toEqual({ minx: -3, miny: -2, maxx: 8, maxy: 9 });
    const target = new Uint8ClampedArray(12);
    copyRasterExt(ext, { minx: -3, miny: -2, maxx: -1, maxy: -2 }, target);
    expect([...target]).toEqual([10, 20, 30, 128, 0, 0, 0, 0, 40, 50, 60, 255]);
    ext.delete("-3,-2"); ext.delete("8,9");
    expect(rasterExtBounds(ext)).toEqual({ minx: -1, miny: -2, maxx: -1, maxy: -2 });
    ext.delete("-1,-2"); expect(rasterExtBounds(ext)).toBeNull();
  });
});
