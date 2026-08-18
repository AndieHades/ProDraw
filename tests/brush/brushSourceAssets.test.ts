import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import {
  BRUSH_SOURCE_ASSET_COUNT, brushSourceAssetUrl
} from "../../src/config/brushSourceAssets";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { cloneCoverageMap } from "../../src/core/brush/brushSourceFolder";
import { testBrushSourceResolver, testGrainMap, testShapeMap } from "./brushTestMaps";

describe("real brush source library", () => {
  it("indexes checked-in shape and grain assets by brush id", () => {
    expect(BRUSH_SOURCE_ASSET_COUNT).toBe(4);
    expect(brushSourceAssetUrl("lineart", "shape")).toContain("lineart.png");
    expect(brushSourceAssetUrl("lineart", "grain")).toContain("lineart.png");
    expect(brushSourceAssetUrl("sketching", "shape")).toContain("sketching.png");
    expect(brushSourceAssetUrl("lineart_long", "shape"))
      .toBe(brushSourceAssetUrl("lineart", "shape"));
    expect(brushSourceAssetUrl("texture", "grain")).toBeNull();
  });

  it("gives Lineart resolved library maps without procedural sources", async () => {
    const preset = BUNDLED_BRUSHES.find(({ id }) => id === "lineart");
    if (!preset) throw new Error("Lineart fixture is missing");
    const source = await readFile(path.join(process.cwd(), "src", "app-folders",
      "brushes", "main", preset.fileName));
    const bytes = new Uint8Array(source.buffer.slice(source.byteOffset,
      source.byteOffset + source.byteLength));
    const loaded = await decodeProcreateBrush(bytes, preset, testBrushSourceResolver);
    expect(loaded.shapeMap).toBe(testShapeMap);
    expect(loaded.grainMap).toBe(testGrainMap);
    expect(loaded.compatibility).toMatchObject({ shapeSourceState: "resolved",
      grainSourceState: "resolved", missingSourceNames: [] });
    expect(loaded.warnings).not.toContain("unresolved-shape-source");
    expect(loaded.warnings).not.toContain("unresolved-grain-source");
  });

  it("keeps an owned source copy when a worker transfers an alias", () => {
    const cached = { width: 2, height: 1, data: Uint8Array.of(0, 255) };
    const transferable = cloneCoverageMap(cached);
    transferable?.data.fill(0);

    expect(cached.data).toEqual(Uint8Array.of(0, 255));
  });
});
