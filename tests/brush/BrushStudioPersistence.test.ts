import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { BrushLibraryService } from "../../src/core/brush-library/BrushLibraryService";
import { cloneBrushPreset } from "../../src/logic/brush/cloneBrushPreset";
import { sourceAsset } from "../../src/logic/brush/brushSourceAsset";
import { updateBrushValue } from "../../src/logic/brush/brushStudioValues";
import { MemoryBrushStorage } from "./MemoryBrushStorage";

describe("Brush Studio draft lifecycle", () => {
  it("discards an unapplied draft and persists an applied revision across restart", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    const source = library.snapshot.sets[0]!.brushes.find(({ id }) => id === "lineart")!;
    const draft = updateBrushValue(cloneBrushPreset(source), "taper.size", 0.9);
    expect(source.taper.size).not.toBe(0.9);

    const canceled = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    const unchanged = canceled.snapshot.sets[0]!.brushes.find(({ id }) => id === source.id)!;
    expect(unchanged.taper.size).toBe(source.taper.size);

    const ownedShape = sourceAsset({ width: 2, height: 2,
      data: Uint8Array.of(0, 96, 160, 255) }, "Lineart Test Shape");
    const applied = await library.applyDraft(source, { ...draft,
      grain: { ...draft.grain, depthJitter: 0.37, filtering: "none" },
      properties: { ...draft.properties, maximumOpacity: 0.82 },
      preview: { ...draft.preview, stamp: true, size: 0.7 },
      sources: { ...draft.sources, shape: ownedShape } });
    expect(applied.fileName).toMatch(/\.prodraw-brush$/);
    expect(storage.files.has(`Main/${applied.fileName}`)).toBe(true);

    const reopened = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    const restored = reopened.snapshot.sets[0]!.brushes.find(({ id }) => id === source.id)!;
    expect(restored.taper.size).toBe(0.9);
    expect(restored.grain.depthJitter).toBe(0.37);
    expect(restored.properties.maximumOpacity).toBe(0.82);
    expect(restored.preview).toMatchObject({ stamp: true, size: 0.7 });
    expect(restored.sources.shape?.sourceBrushName).toBe("Lineart Test Shape");
  });
});
