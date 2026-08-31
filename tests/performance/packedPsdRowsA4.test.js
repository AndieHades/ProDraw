import { describe, expect, it } from "vitest";
import { normalizeLegacyRasterLayer } from
  "../../src/core/raster/legacyRasterOwner.ts";
import { packedRgbaStats } from "../../src/logic/raster/PackedRgbaGrid.ts";
import { packedRgbaRecordFromBitmap } from
  "../../src/logic/raster/packedRgbaRecord.ts";
import { cloneGridIdle } from "../../src/systems/gallery/record-clone.js";

describe("packed dense PSD persistence", () => {
  it("keeps a 2048 square layer in typed rows instead of pixel properties", async () => {
    const width = 2048, height = 2048;
    const rgba = new Uint8ClampedArray(width * height * 4); rgba.fill(255);
    const rasterRows = packedRgbaRecordFromBitmap(width, height,
      { left: 0, top: 0, width, height, rgba });
    const layer = normalizeLegacyRasterLayer({ grid: [], rasterRows }, width, height);
    const stored = await cloneGridIdle(layer.grid, undefined,
      () => true, async () => undefined);

    expect(packedRgbaStats(layer.grid)).toMatchObject({
      storedCells: width * height, allocatedCells: width * height,
      materializedRows: 0,
    });
    expect(stored).toMatchObject({ format: "rgba-rows-v1", width, height,
      opaquePixels: width * height });
    if (!stored || Array.isArray(stored)) throw new Error("missing packed record");
    expect(stored.rows.reduce((total, row) => total + row.bytes.byteLength, 0))
      .toBe(width * height * 4);
  });
});
