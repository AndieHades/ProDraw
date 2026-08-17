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
  "lineart.brush": "6698e54352c3fd719ef655c9b7a5b6244394d8299ed6ae797d48d4344f26aada",
  "lineart_long.brush": "4e511b83ab07419f2d2bce4d12de2c2595ee1ec114b1b3f32ef018168797ecf8"
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
