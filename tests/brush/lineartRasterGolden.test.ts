import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { renderBrushDab } from "../../src/core/brush/renderBrushDab";
import { RasterEdit } from "../../src/core/history/RasterEdit";
import { RasterSurface } from "../../src/core/raster/RasterSurface";

const expected = {
  "lineart.brush": "de53e262287729c74b3512e8e73bf3f58327c13a0a75ef3e6c91dfc4883b2f56",
  "lineart_long.brush": "b345a22961a3b89454c77b62faf2b1933c3538e3cc14c1e8318241bdcafb040a"
} as const;

describe("Lineart raster goldens", () => {
  it("uses the same resolved brick tip and grain for both real archives", async () => {
    for (const fileName of Object.keys(expected) as Array<keyof typeof expected>) {
      const preset = BUNDLED_BRUSHES.find((brush) => brush.fileName === fileName);
      if (!preset) throw new Error(`Missing fixture: ${fileName}`);
      const source = await readFile(path.join(process.cwd(), "src", "app-folders",
        "brushes", "main", fileName));
      const loaded = await decodeProcreateBrush(new Uint8Array(source.buffer.slice(
        source.byteOffset, source.byteOffset + source.byteLength)), preset);
      const surface = new RasterSurface(fileName, 65, 65, 65);
      const edit = new RasterEdit(surface, fileName);
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
      expect(createHash("sha256").update(rgba).digest("hex")).toBe(expected[fileName]);
      expect(surface.getPixel(51, 51).alpha).toBe(0);
      expect(surface.getPixel(42, 32).alpha).toBeGreaterThan(0);
    }
  });
});
