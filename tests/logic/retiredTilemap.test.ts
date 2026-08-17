import { describe, expect, it } from "vitest";
import { retireTilemapRecord } from "../../src/logic/retiredTilemap.ts";

describe("retired tilemap document migration", () => {
  it("keeps cached RGBA rasters and converts every tilemap layer to pixel", () => {
    const grid = [[null, [1, 2, 3, 255]]];
    const frameGrid = [[[4, 5, 6, 255]]];
    const layer: Record<string, unknown> = {
      kind: "tilemap", grid, tilemap: { cells: [{ tileId: 1 }] },
      tilemapSettings: { tileW: 16 },
    };
    const frameLayer: Record<string, unknown> = {
      kind: "tilemap", grid: frameGrid, tilemap: { cells: [] },
    };
    const record: Record<string, unknown> = {
      layers: [layer], tilesets: [{ id: 1 }], tilesetSeq: 1,
      animator: { frames: { frame1: { layers: [frameLayer] } } },
    };

    expect(retireTilemapRecord(record)).toBe(record);
    expect(layer).toMatchObject({ kind: "pixel", grid });
    expect(frameLayer).toMatchObject({ kind: "pixel", grid: frameGrid });
    expect(layer).not.toHaveProperty("tilemap");
    expect(layer).not.toHaveProperty("tilemapSettings");
    expect(frameLayer).not.toHaveProperty("tilemap");
    expect(record).not.toHaveProperty("tilesets");
    expect(record).not.toHaveProperty("tilesetSeq");
  });
});
