import { describe, expect, it } from "vitest";
import { cloneLayer, newLayer, S } from "../../src/core/state.js";
import { rasterOwnerForLayer } from
  "../../src/core/raster/legacyRasterOwner.ts";
import { blank } from "../../src/logic/raster.js";

describe("live legacy raster ownership", () => {
  it("keeps one stable typed owner while raster references change", () => {
    const layer = newLayer("Paint", 8, 6), owner = rasterOwnerForLayer(layer);
    const before = layer.grid; before[2][3] = [10, 20, 30, 255];
    expect(owner?.grid).toBe(before);

    const after = blank(8, 6); after[1][1] = [40, 50, 60, 255];
    layer.grid = after;
    expect(rasterOwnerForLayer(layer)).toBe(owner);
    expect(owner?.grid).toBe(after);

    layer.grid = before;
    expect(owner?.grid).toBe(before);
    expect(layer.grid[2][3]).toEqual([10, 20, 30, 255]);
  });

  it("normalizes loaded and inserted layers without serializing the owner", () => {
    S.W = 5; S.H = 4;
    const loaded = { name: "Loaded", grid: blank(5, 4), ext: new Map() };
    S.layers = [loaded];
    expect(rasterOwnerForLayer(loaded)?.grid).toBe(loaded.grid);
    expect(Object.keys({ ...loaded })).not.toContain("rasterOwner");

    const inserted = { name: "Inserted", grid: blank(5, 4), ext: new Map() };
    S.layers.push(inserted);
    expect(rasterOwnerForLayer(inserted)?.grid).toBe(inserted.grid);
  });

  it("gives a cloned layer an independent owner and mutable pixels", () => {
    const source = newLayer("Source", 3, 3); source.grid[1][1] = [1, 2, 3, 255];
    const copy = cloneLayer(source);
    expect(rasterOwnerForLayer(copy)).not.toBe(rasterOwnerForLayer(source));
    copy.grid[1][1][0] = 99;
    expect(source.grid[1][1][0]).toBe(1);
  });

  it("serves bounded compositor bytes from the same typed owner", () => {
    const layer = newLayer("Render", 8, 6), owner = rasterOwnerForLayer(layer);
    layer.grid[2][3] = [10, 20, 30, 128];
    layer.grid[4][6] = [40, 50, 60, 255]; owner.invalidateSurface();
    const region = owner.readRegion({ minx: 2, miny: 1, maxx: 6, maxy: 4 }, 8, 6);
    expect(region).toMatchObject({ minx: 2, miny: 1, width: 5, height: 4 });
    const first = ((2 - 1) * region.width + 3 - 2) * 4;
    const second = ((4 - 1) * region.width + 6 - 2) * 4;
    expect([...region.data.slice(first, first + 4)]).toEqual([10, 20, 30, 128]);
    expect([...region.data.slice(second, second + 4)]).toEqual([40, 50, 60, 255]);
  });
});
