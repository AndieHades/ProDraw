import { describe, expect, it } from "vitest";
import { RasterSurface } from "../../src/core/raster/RasterSurface";

const red = { red: 255, green: 0, blue: 0, alpha: 255 };

describe("RasterSurface", () => {
  it("allocates RGBA tiles lazily", () => {
    const surface = new RasterSurface("layer", 10_000, 10_000, 4);
    expect(surface.allocatedTileCount).toBe(0);
    expect(surface.getPixel(9999, 9999).alpha).toBe(0);
    surface.blendPixel(7, 9, red);
    expect(surface.allocatedTileCount).toBe(1);
    expect(surface.allocatedBytes).toBe(4 * 4 * 4);
    expect(surface.getPixel(7, 9)).toEqual(red);
  });

  it("composites straight-alpha color without quantizing to a palette", () => {
    const surface = new RasterSurface("layer", 4, 4, 4);
    surface.blendPixel(1, 1, { red: 10, green: 40, blue: 210, alpha: 255 });
    surface.blendPixel(1, 1, red, 0.5);
    expect(surface.getPixel(1, 1)).toEqual({
      red: 133, green: 20, blue: 105, alpha: 255
    });
  });

  it("does not allocate for transparent no-op edits or out-of-bounds pixels", () => {
    const surface = new RasterSurface("layer", 4, 4, 4);
    expect(surface.erasePixel(1, 1)).toBe(true);
    expect(surface.blendPixel(-1, 1, red)).toBe(false);
    expect(surface.allocatedTileCount).toBe(0);
  });

  it("copies and restores tiles without sharing mutable bytes", () => {
    const surface = new RasterSurface("layer", 8, 8, 4);
    surface.blendPixel(1, 1, red);
    const tile = surface.copyTile(0, 0);
    expect(tile).not.toBeNull();
    if (!tile) return;
    tile[0] = 99;
    expect(surface.copyTile(0, 0)?.[0]).toBe(0);
    surface.replaceTile(0, 0, null);
    expect(surface.allocatedTileCount).toBe(0);
    surface.replaceTile(0, 0, tile);
    tile[0] = 1;
    expect(surface.copyTile(0, 0)?.[0]).toBe(99);
  });
});
