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
    expect(loaded.warnings).toContain("built-in-shape-fallback");
    expect(loaded.warnings.every((warning) => !warning.startsWith("archive-fallback")))
      .toBe(true);
  });
});
