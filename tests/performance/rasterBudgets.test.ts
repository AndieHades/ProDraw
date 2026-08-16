import { describe, expect, it } from "vitest";
import { PERFORMANCE_BUDGETS } from "../../src/config/performance";
import { RASTER_LIMITS } from "../../src/config/raster";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentCompositor } from "../../src/core/editor/DocumentCompositor";
import { DocumentSerializer } from "../../src/core/persistence/documentSerialization";
import { fitView } from "../../src/logic/view/viewTransform";

const fixtures = [
  { name: "FHD", width: 1920, height: 1080, dpi: 72 },
  { name: "A4", width: 2480, height: 3508, dpi: 300 },
  { name: "4K", width: 3840, height: 2160, dpi: 72 }
] as const;

const percentile = (values: readonly number[], fraction: number): number =>
  [...values].sort((left, right) => left - right)[
    Math.min(values.length - 1, Math.floor(values.length * fraction))
  ] ?? 0;

function fillDocument(width: number, height: number, name: string) {
  const ids = [`${name}-document`, `${name}-paint`];
  const document = createRasterDocument({ name, width, height, dpi: 72,
    layerName: "Paint" }, () => ids.shift() ?? `${name}-extra`);
  const surface = document.editableSurface();
  const bytes = new Uint8ClampedArray(surface.tileSize * surface.tileSize * 4);
  for (let offset = 0; offset < bytes.length; offset += 4) {
    bytes[offset] = 28; bytes[offset + 1] = 91;
    bytes[offset + 2] = 214; bytes[offset + 3] = 255;
  }
  const columns = Math.ceil(width / surface.tileSize);
  const rows = Math.ceil(height / surface.tileSize);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) surface.replaceTile(x, y, bytes);
  }
  const tileCount = columns * rows;
  const detail = document.addLayer({ id: `${name}-detail`, name: "Detail",
    visible: true, locked: false, opacity: 0.6, blendMode: "normal" }).surface;
  let detailTileCount = 0;
  for (let index = 0; index < tileCount; index += 16) {
    detail.replaceTile(index % columns, Math.floor(index / columns), bytes);
    detailTileCount += 1;
  }
  return { document, tileCount, allocatedTileCount: tileCount + detailTileCount };
}

describe("filled raster performance budgets", () => {
  for (const fixture of fixtures) {
    it(`${fixture.name} reaches a bounded cached plateau`, () => {
      const { document, tileCount, allocatedTileCount } = fillDocument(
        fixture.width, fixture.height, fixture.name);
      const allocated = document.layers.reduce((total, layer) =>
        total + layer.surface.allocatedBytes, 0);
      expect(document.layers).toHaveLength(2);
      expect(allocated).toBe(allocatedTileCount * RASTER_LIMITS.tileSize ** 2 * 4);
      expect(allocated).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.maximumFilledFixtureBytes);
      const compositor = new DocumentCompositor();
      const viewport = PERFORMANCE_BUDGETS.referenceViewport;
      const view = fitView(document.descriptor, viewport, 0);
      const coldStarted = performance.now();
      const frame = compositor.frame(document, view, viewport);
      const coldDuration = performance.now() - coldStarted;
      expect(frame.tiles).toHaveLength(tileCount);
      expect(compositor.metrics.composites).toBe(tileCount);
      expect(coldDuration).toBeLessThan(PERFORMANCE_BUDGETS.coldCompositeMilliseconds);

      const warmDurations = Array.from({ length: 5 }, () => {
        const started = performance.now();
        compositor.frame(document, view, viewport);
        return performance.now() - started;
      });
      expect(compositor.metrics.composites).toBe(tileCount);
      expect(percentile(warmDurations, 0.95))
        .toBeLessThan(PERFORMANCE_BUDGETS.warmCompositeP95Milliseconds);

      const serializer = new DocumentSerializer();
      const saveStarted = performance.now();
      serializer.serialize(document);
      const changedSaveDuration = performance.now() - saveStarted;
      const copied = serializer.copiedTiles;
      const unchangedSaveStarted = performance.now();
      serializer.serialize(document);
      const unchangedSaveDuration = performance.now() - unchangedSaveStarted;
      expect(copied).toBe(allocatedTileCount);
      expect(serializer.copiedTiles - copied)
        .toBe(PERFORMANCE_BUDGETS.autosaveCopiedTilesWithoutChanges);
      expect(changedSaveDuration)
        .toBeLessThan(PERFORMANCE_BUDGETS.changedSerializationMilliseconds);
      expect(unchangedSaveDuration)
        .toBeLessThan(PERFORMANCE_BUDGETS.unchangedSerializationMilliseconds);
      if (process.env.PRODRAW_REPORT_PERF === "1") {
        console.info(`${fixture.name}: tiles=${tileCount} bytes=${allocated} ` +
          `cold=${coldDuration.toFixed(2)}ms warmP50=` +
          `${percentile(warmDurations, 0.5).toFixed(2)}ms warmP95=` +
          `${percentile(warmDurations, 0.95).toFixed(2)}ms ` +
          `saveChanged=${changedSaveDuration.toFixed(2)}ms ` +
          `saveUnchanged=${unchangedSaveDuration.toFixed(2)}ms`);
      }
    });
  }
});
