import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { builtInBrushSource } from "../../src/logic/brush/builtinBrushSource";

describe("known Procreate built-in brush sources", () => {
  it("materializes every built-in identity used by bundled brushes", () => {
    const shapes = ["Brush-Preset-Hard.png", "Brush-Preset-Soft.png",
      "Brush-Pocket-Brick.png", "Brush-Artery-Ultra-Soft.jpg", "Haggard-Oval.png"];
    const grains = ["Brush-Preset-Blank.png", "Brush-Artery-Charcoal-Corse.jpg",
      "Cotton-Paper.jpg", "Brush-Artery-Charcoal-Vine.jpg"];
    for (const name of shapes) expect(builtInBrushSource(name, "shape")?.data.some(Boolean),
      name).toBe(true);
    for (const name of grains) expect(builtInBrushSource(name, "grain")?.data.length,
      name).toBe(256 * 256);
    expect(builtInBrushSource("Unknown.png", "shape")).toBeNull();
  });

  it("gives Lineart its authored brick tip and charcoal grain", async () => {
    const preset = BUNDLED_BRUSHES.find(({ fileName }) => fileName === "lineart.brush");
    if (!preset) throw new Error("Lineart fixture is missing");
    const source = await readFile(path.join(process.cwd(), "src", "app-folders",
      "brushes", "main", preset.fileName));
    const bytes = new Uint8Array(source.buffer.slice(source.byteOffset,
      source.byteOffset + source.byteLength));
    const loaded = await decodeProcreateBrush(bytes, preset);
    expect(loaded.shape.sourceName).toBe("Brush-Pocket-Brick.png");
    expect(loaded.grain.sourceName).toBe("Brush-Artery-Charcoal-Corse.jpg");
    expect(loaded.shapeMap).toMatchObject({ width: 256, height: 256 });
    expect(loaded.grainMap).toMatchObject({ width: 256, height: 256,
      scaleReference: 2048 });
    expect(loaded.warnings).not.toContain("unresolved-shape-source");
    expect(new Set(loaded.shapeMap?.data).size).toBeGreaterThan(2);
    expect(new Set(loaded.grainMap?.data).size).toBeGreaterThan(32);
  });
});
