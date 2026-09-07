// Превью кисти рисуется тем же движком, что и ход: плитка панели показывает
// настоящий мазок пресета или твёрдой формы, а не первую букву имени.
import type { LoadedBrush } from "../../contracts/brush.ts";
import type { StrokeSample } from "../../contracts/stroke.ts";
import { presetEngine } from "./preset-brush.ts";
import { stampTip, tipRadius, tipSpacing } from "./soft-tip.ts";

export interface PreviewRequest {
  readonly width: number;
  readonly height: number;
  readonly brush?: LoadedBrush | null;
  readonly square?: boolean;
}

const STEPS = 28;
const previewSize = (height: number): number => Math.max(2, height * 0.24);

// Мазок ведём по дуге с нарастающим и спадающим нажимом: так видно и форму
// края, и реакцию пресета на давление.
function previewPath(width: number, height: number): StrokeSample[] {
  const path: StrokeSample[] = [], margin = Math.max(3, width * 0.18);
  for (let step = 0; step <= STEPS; step++) {
    const progress = step / STEPS;
    path.push({ x: margin + (width - margin * 2) * progress,
      y: height / 2 - Math.sin(progress * Math.PI * 1.15 - 0.35) * height * 0.09,
      pressure: 0.18 + 0.82 * Math.sin(Math.PI * progress) ** 0.6,
      tiltX: 0, tiltY: 0, time: step * 14, pointerType: "pen" });
  }
  return path;
}

function presetCoverage(brush: LoadedBrush, path: readonly StrokeSample[],
  size: number, put: (x: number, y: number, opacity: number) => void): boolean {
  const engine = presetEngine(); if (!engine) return false;
  const pipeline = new engine.StrokePipeline(brush, Math.max(1, size));
  const settings = { size, opacity: 1, erase: false };
  const render = (dabs: readonly StrokeSample[]): void => {
    for (const dab of dabs) engine.visitBrushDab(brush, dab, settings, put);
  };
  for (const sample of path) render(pipeline.push(sample));
  render(pipeline.finish()); return true;
}

function tipCoverage(path: readonly StrokeSample[], size: number, square: boolean,
  put: (x: number, y: number, opacity: number) => void): void {
  const radius = tipRadius(size), spacing = tipSpacing(radius);
  let previous: StrokeSample | null = null;
  for (const sample of path) {
    if (previous) {
      const dx = sample.x - previous.x, dy = sample.y - previous.y;
      const steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) / spacing);
      for (let step = 1; step < steps; step++) stampTip(previous.x + dx * step / steps,
        previous.y + dy * step / steps, radius, square, 1, put);
    }
    stampTip(sample.x, sample.y, radius, square, 1, put); previous = sample;
  }
}

// Покрытие пикселя за мазок берётся максимумом, как и на слое: пересечение
// пути не самозатемняется.
export function brushPreviewCoverage(request: PreviewRequest): Float32Array {
  const { width, height } = request, coverage = new Float32Array(width * height);
  const put = (x: number, y: number, opacity: number): void => {
    const px = Math.round(x), py = Math.round(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const index = py * width + px;
    if (opacity > (coverage[index] ?? 0)) coverage[index] = Math.min(1, opacity);
  };
  const path = previewPath(width, height), size = previewSize(height);
  if (!request.brush || !presetCoverage(request.brush, path, size, put)) {
    tipCoverage(path, size, !!request.square, put);
  }
  return coverage;
}

// Покрытие → RGBA: цвет мазка приходит от вызывающего, фон остаётся прозрачным.
export function brushPreviewPixels(request: PreviewRequest,
  colour: readonly [number, number, number]): Uint8ClampedArray {
  const coverage = brushPreviewCoverage(request);
  const pixels = new Uint8ClampedArray(coverage.length * 4);
  for (let index = 0; index < coverage.length; index++) {
    const alpha = coverage[index] ?? 0; if (alpha <= 0) continue;
    const offset = index * 4;
    pixels[offset] = colour[0]; pixels[offset + 1] = colour[1];
    pixels[offset + 2] = colour[2]; pixels[offset + 3] = Math.round(alpha * 255);
  }
  return pixels;
}
