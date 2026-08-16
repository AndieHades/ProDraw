import { describe, expect, it } from "vitest";
import type { BrushPreset, CoverageMap, LoadedBrush } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { BrushSourceCatalog } from "../../src/core/brush/BrushSourceCatalog";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush";
import {
  effectiveBrushSources, selectBrushSource, sourceAsset, sourceCoverage
} from "../../src/logic/brush/brushSourceAsset";

const map = (...data: number[]): CoverageMap =>
  ({ width: 2, height: 2, data: Uint8Array.from(data) });
const loaded = (preset: BrushPreset,
  shape: CoverageMap | null, grain: CoverageMap | null): LoadedBrush =>
  ({ ...preset, shapeMap: shape, grainMap: grain, nativeShapeMap: shape,
    nativeGrainMap: grain, compatibility: emptyBrushCompatibility(), warnings: [] });

describe("brush source library", () => {
  it("round trips an owned alpha source and rejects malformed data", () => {
    const original = map(0, 64, 128, 255);
    const asset = sourceAsset(original, "Ink Sponge");
    expect(sourceCoverage(asset)).toEqual(original);
    expect(() => sourceCoverage({ ...asset, alphaBase64: "AA==" }))
      .toThrow("Invalid brush source data");
  });

  it("applies an embedded source over the brush archive", () => {
    const preset = BUNDLED_BRUSHES[0]!;
    const native = map(255, 255, 255, 255);
    const replacement = map(0, 64, 128, 255);
    const selected = selectBrushSource(preset, "shape", sourceAsset(replacement, "Texture"));
    expect(effectiveBrushSources(selected, loaded(preset, native, null)).shapeMap)
      .toEqual(replacement);
  });

  it("retains selected copies after their original brush is deleted", async () => {
    const first = BUNDLED_BRUSHES[0]!;
    const shape = map(0, 255, 255, 0);
    const second = selectBrushSource(BUNDLED_BRUSHES[1]!, "shape",
      sourceAsset(shape, first.name));
    const grain = map(10, 20, 30, 40);
    const byId = new Map<string, LoadedBrush>([
      [first.id, loaded(first, shape, null)], [second.id, loaded(second, null, grain)]
    ]);
    const catalog = new BrushSourceCatalog();
    const load = async (brush: BrushPreset) => byId.get(brush.id)!;
    expect(await catalog.collect([first, second], load)).toHaveLength(2);
    const afterDelete = await catalog.collect([second], load);
    expect(afterDelete.map(({ kind }) => kind).sort()).toEqual(["grain", "shape"]);
    expect(afterDelete.find(({ kind }) => kind === "shape")?.sourceBrushName)
      .toBe(first.name);
  });
});
