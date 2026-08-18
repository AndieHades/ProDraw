import { describe, expect, it, vi } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { BrushPreset, LoadedBrush } from "../../src/contracts/brush";
import type { BrushDecoderPort } from "../../src/contracts/brushDecoder";
import { BrushCatalog } from "../../src/core/brush/BrushCatalog";
import { MemoryBrushStorage } from "./MemoryBrushStorage";

function loaded(preset: BrushPreset): LoadedBrush {
  return { ...preset, shapeMap: null, grainMap: null,
    nativeShapeMap: null, nativeGrainMap: null,
    compatibility: { archiveVersion: 4, archiveName: preset.name,
      supportedFields: [], unsupportedActiveFields: [],
      excludedSections: ["wet-mix", "color-dynamics", "materials"],
      shapeSourceState: "missing", grainSourceState: "missing",
      missingSourceNames: [] }, warnings: [] };
}

describe("BrushCatalog decoder boundary", () => {
  it("uses the injected decoder and retries while preserving last-working data", async () => {
    const preset = BUNDLED_BRUSHES[0];
    if (!preset) throw new Error("Bundled brush fixture is unavailable");
    const storage = new MemoryBrushStorage();
    storage.files.set(`${preset.setName}/${preset.baseFileName}`, Uint8Array.of(1, 2, 3));
    let shouldFail = false;
    const decode = vi.fn(async (_bytes: Uint8Array<ArrayBuffer>, candidate: BrushPreset) => {
      if (shouldFail) throw new Error("decode failed");
      return loaded(candidate);
    });
    const decoder: BrushDecoderPort = { decode };
    const catalog = new BrushCatalog(storage, decoder);
    await expect(catalog.load(preset)).resolves.toMatchObject({ id: preset.id });
    expect(decode.mock.calls[0]?.[0]).toEqual(Uint8Array.of(1, 2, 3));

    shouldFail = true;
    const revised = { ...preset, revision: preset.revision + 1 };
    const fallback = await catalog.load(revised);
    expect(fallback.warnings).toContain("last-working-fallback");
    shouldFail = false;
    await expect(catalog.load(revised)).resolves.toMatchObject({ revision: revised.revision });
    expect(decode).toHaveBeenCalledTimes(3);
  });
});
