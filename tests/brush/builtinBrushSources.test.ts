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
    expect(loaded.taper).toMatchObject({ start: 0.6676636338233948,
      end: 0.5339549779891968, size: 0.569232702255249,
      opacity: 0.2347826063632965, pressure: 0.25706204771995544,
      tip: 0.14308422803878784, tipAnimation: true, linkTipSizes: false });
    expect(loaded.taper).toMatchObject({ touchStart: 0.2792918086051941,
      touchEnd: 0.1809726357460022, touchSize: 1, touchOpacity: 1,
      touchTip: 0, touchLinkTipSizes: false });
    expect(loaded.shape).toMatchObject({ inputStyle: "azimuth", rotation: 1,
      count: 2, filtering: "improved", relativeToStroke: false });
    expect(loaded.strokePath.scatter).toBeCloseTo(0.19181033968925476);
    expect(loaded.grain).toMatchObject({ behavior: "moving", movement: 1,
      scale: 0.13357694447040558, zoom: 1, strength: 1,
      offsetJitter: true, filtering: "none" });
    expect(loaded.rendering.mode).toBe("intense-blending");
    expect(loaded.smudge.pull).toBeCloseTo(0.8300715088844299);
    expect(loaded.properties).toMatchObject({ maximumSize: 147.80409634113312,
      maximumOpacity: 0.921895444393158,
      minimumOpacity: 0.06339427083730698, orientToScreen: false });
    expect(loaded.properties.minimumSize).toBeCloseTo(1, 3);
    expect(loaded.preview).toMatchObject({ stamp: false, size: 1,
      pressureMinimum: 0, pressureScale: 1, tiltAngle: 0 });
    expect(loaded.warnings).not.toContain("unresolved-shape-source");
    expect(new Set(loaded.shapeMap?.data).size).toBeGreaterThan(2);
    expect(new Set(loaded.grainMap?.data).size).toBeGreaterThan(32);
  });
});
