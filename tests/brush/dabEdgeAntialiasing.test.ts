import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes.ts";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush.ts";
import { visitBrushDab } from "../../src/core/brush/renderBrushDab.ts";
import type { LoadedBrush } from "../../src/contracts/brush.ts";

async function load(fileName: string): Promise<LoadedBrush> {
  const preset = BUNDLED_BRUSHES.find((brush) => brush.fileName === fileName);
  if (!preset) throw new Error(`missing fixture ${fileName}`);
  const bytes = await readFile(path.join(process.cwd(), "src", "app-folders",
    "brushes", "main", fileName));
  return decodeProcreateBrush(new Uint8Array(bytes.buffer.slice(bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength)), preset);
}

const sample = { x: 100.5, y: 100.5, pressure: 1, tiltX: 0, tiltY: 0, time: 0 };

function rim(brush: LoadedBrush, size: number) {
  let full = 0, partial = 0, weakest = 1;
  visitBrushDab(brush, sample, { size, opacity: 1, erase: false }, (_x, _y, opacity) => {
    if (opacity >= 0.999) full += 1;
    else if (opacity > 0.001) { partial += 1; weakest = Math.min(weakest, opacity); }
  });
  return { full, partial, weakest };
}

describe("dab edge antialiasing", () => {
  // Base Color, Screentone, Net Screentone и Shadow приходят с hardness 1.
  // Спад кромки считался как `1 - hardness`, то есть 0.001 радиуса: край
  // выходил бинарным, и на кривой штрих шёл зазубринами.
  it.each(["base_color.brush", "screentone.brush", "shadow.brush"])(
    "gives %s a soft rim even at hardness 1", async (fileName) => {
      const brush = await load(fileName);
      expect(brush.shape.hardness).toBeGreaterThan(0.99);
      const edge = rim(brush, 60);
      expect(edge.full).toBeGreaterThan(2000);
      // Кромка круга радиусом 30 — около 190 пикселей; ждём хотя бы половину.
      expect(edge.partial).toBeGreaterThan(90);
      expect(edge.weakest).toBeLessThan(0.5);
    });

  it("keeps a soft brush soft", async () => {
    const brush = await load("big_soft_brush.brush");
    const edge = rim(brush, 60);
    expect(edge.partial).toBeGreaterThan(edge.full);
  });

  // Пол сглаживания задан в пикселях, поэтому у крупной кисти он не должен
  // размывать кромку сильнее, чем у мелкой.
  it("scales the rim with the dab, not with the canvas", async () => {
    const brush = await load("base_color.brush");
    const small = rim(brush, 20), large = rim(brush, 120);
    expect(small.partial / small.full).toBeGreaterThan(large.partial / large.full);
  });
});
