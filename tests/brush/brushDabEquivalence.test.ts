import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { pressureBrushSize, visitBrushDab } from "../../src/core/brush/renderBrushDab";
import { brushCoverageSampler } from "../../src/logic/brush/brushCoverage";
import { brushDabOpacity } from "../../src/logic/brush/brushOpacity";
import { dabStampPlan } from "../../src/logic/brush/dabStampPlan";
import type { LoadedBrush } from "../../src/contracts/brush";
import type { BrushRenderSettings, StrokeSample } from "../../src/contracts/stroke";

function referenceDab(brush: LoadedBrush, sample: StrokeSample,
  settings: BrushRenderSettings, visit: (x: number, y: number, opacity: number) => void): void {
  const size = pressureBrushSize(brush, settings.size, sample);
  const radius = size / 2;
  const sampler = brushCoverageSampler(brush);
  const baseOpacity = brushDabOpacity(brush, sample, settings.opacity);
  for (const stamp of dabStampPlan(brush, sample, size)) {
    const extent = radius * Math.max(stamp.scaleX, stamp.scaleY) + 1;
    for (let y = Math.floor(stamp.y - extent); y <= Math.ceil(stamp.y + extent); y += 1) {
      for (let x = Math.floor(stamp.x - extent); x <= Math.ceil(stamp.x + extent); x += 1) {
        const coverage = sampler.tip((x + 0.5 - stamp.x) / radius,
          (y + 0.5 - stamp.y) / radius, stamp);
        if (coverage <= 0) continue;
        const opacity = baseOpacity * coverage * sampler.texture(x, y, {
          centerX: stamp.x, centerY: stamp.y, offsetX: stamp.grainOffsetX,
          offsetY: stamp.grainOffsetY, depthScale: stamp.grainDepthScale });
        if (opacity > 0) visit(x, y, opacity);
      }
    }
  }
}

function rgbaRaster(width: number, height: number,
  render: (visit: (x: number, y: number, opacity: number) => void) => void
): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const pixel = offset / 4;
    rgba[offset] = (pixel * 17) % 256; rgba[offset + 1] = (pixel * 29) % 256;
    rgba[offset + 2] = (pixel * 43) % 256; rgba[offset + 3] = (pixel * 11) % 256;
  }
  render((x, y, opacity) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    const sourceAlpha = (217 / 255) * Math.max(0, Math.min(1, opacity));
    const destinationAlpha = rgba[offset + 3]! / 255;
    const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    const destinationWeight = destinationAlpha * (1 - sourceAlpha);
    rgba[offset] = Math.round((203 * sourceAlpha + rgba[offset]! *
      destinationWeight) / outputAlpha);
    rgba[offset + 1] = Math.round((47 * sourceAlpha + rgba[offset + 1]! *
      destinationWeight) / outputAlpha);
    rgba[offset + 2] = Math.round((129 * sourceAlpha + rgba[offset + 2]! *
      destinationWeight) / outputAlpha);
    rgba[offset + 3] = Math.round(outputAlpha * 255);
  });
  return rgba;
}

describe("brush dab optimized visitor", () => {
  it("matches the scalar renderer exactly for every bundled brush", async () => {
    const sample = { x: 52.25, y: 49.75, pressure: 0.73,
      tiltX: 17, tiltY: -9, time: 8 };
    const settings = { size: 48, opacity: 0.83, erase: false };
    for (const preset of BUNDLED_BRUSHES) {
      const source = await readFile(path.join(process.cwd(), "src", "app-folders",
        "brushes", "main", preset.fileName));
      const brush = await decodeProcreateBrush(new Uint8Array(source.buffer.slice(
        source.byteOffset, source.byteOffset + source.byteLength)), preset);
      const expected = rgbaRaster(108, 104,
        (visit) => referenceDab(brush, sample, settings, visit));
      const actual = rgbaRaster(108, 104,
        (visit) => visitBrushDab(brush, sample, settings, visit));
      expect(actual, preset.fileName).toEqual(expected);
    }
  }, 30_000);
});
