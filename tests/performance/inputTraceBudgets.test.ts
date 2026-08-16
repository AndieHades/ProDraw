import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { PERFORMANCE_BUDGETS } from "../../src/config/performance";
import { RASTER_LIMITS } from "../../src/config/raster";
import { renderBrushDab } from "../../src/core/brush/renderBrushDab";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentCompositor } from "../../src/core/editor/DocumentCompositor";
import { TileHistory } from "../../src/core/history/TileHistory";
import { fitView } from "../../src/logic/view/viewTransform";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

const percentile = (values: readonly number[], fraction: number): number =>
  [...values].sort((left, right) => left - right)[
    Math.min(values.length - 1, Math.floor(values.length * fraction))
  ] ?? 0;

describe("raster input and retention budgets", () => {
  it("keeps a 240 Hz A4 stroke and presentation within their budgets", () => {
    const ids = ["trace-document", "trace-layer"];
    const document = createRasterDocument({ name: "Trace", width: 2480, height: 3508,
      dpi: 300, layerName: "Paint" }, () => ids.shift() ?? "trace-extra");
    const brush = BUNDLED_BRUSHES.find(({ name }) => name === "Base Color") ??
      BUNDLED_BRUSHES[0];
    if (!brush) throw new Error("Bundled brush fixture is unavailable");
    const history = new TileHistory();
    const edit = history.begin(document.editableSurface(), "240 Hz trace");
    const pipeline = new StrokePipeline(brush, 24);
    const compositor = new DocumentCompositor();
    const viewport = PERFORMANCE_BUDGETS.referenceViewport;
    const view = fitView(document.descriptor, viewport, 0);
    const inputDurations: number[] = [];
    const presentDurations: number[] = [];
    for (let index = 0; index < 240; index += 1) {
      const started = performance.now();
      const samples = pipeline.push({ x: 100 + index * 8,
        y: 500 + Math.sin(index / 12) * 40, pressure: 0.65,
        tiltX: 8, tiltY: -3, time: index * (1000 / 240) });
      for (const sample of samples) renderBrushDab(edit, brush, sample,
        { size: 24, opacity: 1, erase: false },
        { red: 20, green: 40, blue: 80, alpha: 255 });
      inputDurations.push(performance.now() - started);
      compositor.frame(document, view, viewport);
      presentDurations.push(performance.now() - started);
    }
    for (const sample of pipeline.finish()) renderBrushDab(edit, brush, sample,
      { size: 24, opacity: 1, erase: false },
      { red: 20, green: 40, blue: 80, alpha: 255 });
    history.record(edit.commit());
    expect(percentile(inputDurations, 0.95))
      .toBeLessThan(PERFORMANCE_BUDGETS.pointerKernelP95Milliseconds);
    expect(percentile(presentDurations, 0.95))
      .toBeLessThan(PERFORMANCE_BUDGETS.inputToPresentP95Milliseconds);
    expect(document.editableSurface().allocatedBytes)
      .toBeLessThanOrEqual(PERFORMANCE_BUDGETS.maximumTraceAllocatedBytes);
    expect(history.undoBytes).toBeLessThanOrEqual(RASTER_LIMITS.maximumHistoryBytes);
    if (process.env.PRODRAW_REPORT_PERF === "1") {
      console.info(`A4-240Hz: inputP50=${percentile(inputDurations, 0.5).toFixed(2)}ms ` +
        `inputP95=${percentile(inputDurations, 0.95).toFixed(2)}ms ` +
        `presentP50=${percentile(presentDurations, 0.5).toFixed(2)}ms ` +
        `presentP95=${percentile(presentDurations, 0.95).toFixed(2)}ms ` +
        `surfaceBytes=${document.editableSurface().allocatedBytes} ` +
        `historyBytes=${history.undoBytes}`);
    }
  });

  it("reaches a retained-memory plateau across a virtual five-minute trace", () => {
    const ids = ["plateau-document", "plateau-layer"];
    const document = createRasterDocument({ name: "Plateau", width: 2480, height: 3508,
      dpi: 300, layerName: "Paint" }, () => ids.shift() ?? "plateau-extra");
    const history = new TileHistory(32, 8 * 1024 * 1024);
    const surface = document.editableSurface();
    let plateauBytes = 0;
    for (let second = 0; second < 300; second += 1) {
      const edit = history.begin(surface, `second-${second}`);
      edit.setPixel(20 + second % 32, 20, {
        red: second % 2 ? 255 : 0, green: 20, blue: 40, alpha: 255
      });
      history.record(edit.commit());
      if (second === 149) plateauBytes = history.undoBytes;
    }
    expect(surface.allocatedTileCount).toBe(1);
    expect(history.undoCount).toBe(16);
    expect(history.undoBytes).toBe(plateauBytes);
    expect(history.undoBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  });
});
