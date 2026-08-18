import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { renderBrushDab } from "../../src/core/brush/renderBrushDab";
import { RasterEdit } from "../../src/core/history/RasterEdit";
import { RasterSurface } from "../../src/core/raster/RasterSurface";
import { testBrushSourceResolver } from "./brushTestMaps";

const fileNames = ["lineart.brush", "lineart_long.brush"] as const;

function raster(loaded: Awaited<ReturnType<typeof decodeProcreateBrush>>): Uint8Array {
  const surface = new RasterSurface(loaded.fileName, 65, 65, 65);
  const edit = new RasterEdit(surface, loaded.fileName);
  renderBrushDab(edit, loaded,
    { x: 32.5, y: 32.5, pressure: 1, tiltX: 0, tiltY: 0, time: 0 },
    { size: 48, opacity: 1, erase: false },
    { red: 255, green: 255, blue: 255, alpha: 255 });
  edit.commit();
  const rgba = new Uint8Array(65 * 65 * 4);
  for (let y = 0; y < 65; y += 1) for (let x = 0; x < 65; x += 1) {
    const pixel = surface.getPixel(x, y), offset = (y * 65 + x) * 4;
    rgba[offset] = pixel.red; rgba[offset + 1] = pixel.green;
    rgba[offset + 2] = pixel.blue; rgba[offset + 3] = pixel.alpha;
  }
  return rgba;
}

describe("Lineart raster goldens", () => {
  it("uses the same resolved brick tip and grain for both real archives", async () => {
    for (const fileName of fileNames) {
      const preset = BUNDLED_BRUSHES.find((brush) => brush.fileName === fileName);
      if (!preset) throw new Error(`Missing fixture: ${fileName}`);
      const source = await readFile(path.join(process.cwd(), "src", "app-folders",
        "brushes", "main", fileName));
      const bytes = new Uint8Array(source.buffer.slice(
        source.byteOffset, source.byteOffset + source.byteLength));
      const loaded = await decodeProcreateBrush(bytes, preset, testBrushSourceResolver);
      expect(loaded.compatibility.shapeSourceState).toBe("resolved");
      expect(loaded.compatibility.grainSourceState).toBe("resolved");
      expect(loaded.shapeMap).not.toBeNull();
      expect(loaded.grainMap).not.toBeNull();
      expect(raster(loaded)).toEqual(raster(loaded));
    }
  });
});
