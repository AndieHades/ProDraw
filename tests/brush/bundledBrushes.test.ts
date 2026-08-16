import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";

describe("bundled brush catalog", () => {
  it("owns all twelve source archives with distinct profiles", () => {
    expect(BUNDLED_BRUSHES).toHaveLength(12);
    expect(new Set(BUNDLED_BRUSHES.map(({ fileName }) => fileName)).size).toBe(12);
    expect(BUNDLED_BRUSHES.every(({ sourceUrl }) => sourceUrl.length > 0)).toBe(true);
  });

  it("isolates a real archive decode and reports honest fallbacks", async () => {
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
    const loaded = await decodeProcreateBrush(bytes, preset);
    expect(loaded.id).toBe("lineart");
    expect(loaded.compatibility.archiveVersion).toBe(4);
    expect(loaded.compatibility.archiveName).toBe("LINEART");
    expect(loaded.stabilization.streamlineAmount).toBeCloseTo(0.6453877687);
    expect(loaded.stabilization.stabilizationAmount).toBeCloseTo(0.0584949069);
    expect(loaded.warnings).toContain("built-in-shape-fallback");
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
});
