import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { brushTipCoverage } from "../../src/logic/brush/brushCoverage";
import { sourceAsset } from "../../src/logic/brush/brushSourceAsset";
import { testBrushSourceResolver } from "./brushTestMaps";

describe("bundled brush catalog", () => {
  it("owns all twelve source archives with distinct profiles", () => {
    expect(BUNDLED_BRUSHES).toHaveLength(12);
    expect(new Set(BUNDLED_BRUSHES.map(({ fileName }) => fileName)).size).toBe(12);
    expect(BUNDLED_BRUSHES.every(({ sourceUrl }) => sourceUrl.length > 0)).toBe(true);
  });

  it("isolates a real archive decode and preserves its built-in shape", async () => {
    const preset = BUNDLED_BRUSHES.find(({ fileName }) =>
      fileName === "lineart.brush");
    expect(preset).toBeDefined();
    if (!preset) return;
    const filePath = path.join(process.cwd(), "src", "app-folders", "brushes",
      "main", preset.fileName);
    const source = await readFile(filePath);
    const bytes = new Uint8Array(source.buffer.slice(
      source.byteOffset, source.byteOffset + source.byteLength
    ));
    const loaded = await decodeProcreateBrush(bytes, preset, testBrushSourceResolver);
    expect(loaded.id).toBe("lineart");
    expect(loaded.compatibility.archiveVersion).toBe(4);
    expect(loaded.compatibility.archiveName).toBe("LINEART");
    expect(loaded.stabilization.streamlineAmount).toBeCloseTo(0.6453877687);
    expect(loaded.stabilization.stabilizationAmount).toBeCloseTo(0.0584949069);
    expect(loaded.shape.sourceName).toBe("Brush-Pocket-Brick.png");
    expect(brushTipCoverage(loaded, 0.8, 0.8)).toBe(0);
    expect(brushTipCoverage(loaded, 0.35, 0)).toBeGreaterThan(0);
    expect(loaded.shapeMap?.data.some(Boolean)).toBe(true);
    expect(loaded.grainMap?.data.some(Boolean)).toBe(true);
    expect(loaded.warnings).not.toContain("unresolved-shape-source");
    expect(loaded.warnings.every((warning) => !warning.startsWith("archive-fallback")))
      .toBe(true);
  });

  it("decodes settings and compatibility independently for all archives", async () => {
    const signatures = new Set<string>();
    for (const preset of BUNDLED_BRUSHES) {
      const filePath = path.join(process.cwd(), "src", "app-folders", "brushes",
        "main", preset.fileName);
      const source = await readFile(filePath);
      const loaded = await decodeProcreateBrush(new Uint8Array(source.buffer.slice(
        source.byteOffset, source.byteOffset + source.byteLength
      )), preset);
      expect(loaded.compatibility.archiveVersion, preset.name).toBe(4);
      expect(loaded.compatibility.supportedFields.length, preset.name).toBeGreaterThan(10);
      expect(loaded.warnings.some((warning) =>
        warning.startsWith("archive-settings-fallback")), preset.name).toBe(false);
      signatures.add(JSON.stringify({ path: loaded.strokePath,
        stabilization: loaded.stabilization, taper: loaded.taper,
        shape: loaded.shape, grain: loaded.grain, rendering: loaded.rendering,
        dynamics: loaded.dynamics, properties: loaded.properties }));
    }
    expect(signatures.size).toBe(BUNDLED_BRUSHES.length);
  }, 30_000);

  it("keeps authored ProDraw settings while reusing archive assets", async () => {
    const preset = BUNDLED_BRUSHES.find(({ fileName }) => fileName === "lineart.brush")!;
    const filePath = path.join(process.cwd(), "src", "app-folders", "brushes",
      "main", preset.fileName);
    const source = await readFile(filePath);
    const authored = { ...preset, fileName: "lineart-custom.prodraw-brush",
      stabilization: { ...preset.stabilization, streamlineAmount: 0.123 },
      smudge: { ...preset.smudge, pull: 0.44 },
      properties: { ...preset.properties, minimumSize: 7, maximumSize: 77 },
      sources: { ...preset.sources, shape: sourceAsset(
        { width: 2, height: 2, data: Uint8Array.of(0, 64, 128, 255) }, "Texture") } };
    const loaded = await decodeProcreateBrush(new Uint8Array(source.buffer.slice(
      source.byteOffset, source.byteOffset + source.byteLength
    )), authored);
    expect(loaded.stabilization.streamlineAmount).toBe(0.123);
    expect(loaded.smudge.pull).toBe(0.44);
    expect(loaded.properties).toEqual({ ...preset.properties,
      minimumSize: 7, maximumSize: 77 });
    expect(loaded.shapeMap?.data).toEqual(Uint8Array.of(0, 64, 128, 255));
    expect(loaded.compatibility.archiveVersion).toBe(4);
  });
});
