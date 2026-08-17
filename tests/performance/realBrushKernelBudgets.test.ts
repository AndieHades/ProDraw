import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { visitBrushDab } from "../../src/core/brush/renderBrushDab";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

async function load(fileName: string) {
  const preset = BUNDLED_BRUSHES.find((brush) => brush.fileName === fileName);
  if (!preset) throw new Error(`Missing brush fixture: ${fileName}`);
  const bytes = await readFile(path.join(process.cwd(), "src", "app-folders",
    "brushes", "main", fileName));
  return decodeProcreateBrush(new Uint8Array(bytes.buffer.slice(
    bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), preset);
}

function measure(brush: Awaited<ReturnType<typeof load>>, size: number) {
  const pipeline = new StrokePipeline(brush, size);
  const start = { x: 200, y: 200, pressure: 1, tiltX: 0, tiltY: 0, time: 0 };
  const end = { ...start, x: start.x + 8, time: 4 };
  const samples = [...pipeline.push(start), ...pipeline.push(end), ...pipeline.finish()];
  let pixels = 0;
  const started = performance.now();
  for (const sample of samples) visitBrushDab(brush, sample,
    { size, opacity: 1, erase: false }, () => { pixels += 1; });
  return { milliseconds: performance.now() - started, pixels, dabs: samples.length };
}

describe("real brush raster kernel budgets", () => {
  it("keeps authored one-percent Lineart spacing without a blocky gap", async () => {
    const brush = await load("lineart.brush");
    const result = measure(brush, 148);
    expect(result.dabs).toBeGreaterThan(5);
    expect(result.dabs).toBeLessThan(10);
    expect(result.pixels).toBeGreaterThan(10_000);
    expect(result.milliseconds).toBeLessThan(50);
    if (process.env.PRODRAW_REPORT_PERF === "1") console.info("Lineart-148", result);
  });

  it("bounds a large soft brush input segment", async () => {
    const brush = await load("big_soft_brush.brush");
    const result = measure(brush, 500);
    expect(result.dabs).toBeLessThan(5);
    expect(result.milliseconds).toBeLessThan(50);
    if (process.env.PRODRAW_REPORT_PERF === "1") console.info("BigSoft-500", result);
  });
});
