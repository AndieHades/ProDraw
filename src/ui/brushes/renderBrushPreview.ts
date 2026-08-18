import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { RasterEdit } from "../../core/history/RasterEdit";
import { RasterSurface } from "../../core/raster/RasterSurface";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";

const previewColor = { red: 245, green: 245, blue: 248, alpha: 255 } as const;

export function renderBrushPreview(
  canvas: HTMLCanvasElement,
  brush: BrushPreset | LoadedBrush
): void {
  const width = 180;
  const height = 44;
  canvas.width = width;
  canvas.height = height;
  const surface = new RasterSurface(`preview/${brush.id}`, width, height, 64);
  const edit = new RasterEdit(surface, "Preview");
  const size = 22 * brush.preview.size;
  if (brush.preview.stamp) {
    renderTextureStamp(edit, brush, Math.min(height - 4, size * 1.5), width, height);
    edit.commit(); paintSurface(canvas, surface); return;
  }
  const pipeline = new StrokePipeline(brush, size);
  for (let index = 0; index <= 24; index += 1) {
    const amount = index / 24;
    const source = {
      x: 8 + amount * (width - 16), y: height / 2 + Math.sin(amount * Math.PI) * 3,
      pressure: Math.max(brush.preview.pressureMinimum, Math.min(1,
        (0.18 + amount * 0.82) * brush.preview.pressureScale)),
      tiltX: brush.preview.tiltAngle * 90, tiltY: 0, time: index,
      pointerType: "pen" as const
    };
    pipeline.push(source);
  }
  pipeline.finish();
  for (const sample of pipeline.completedPlan()) renderBrushDab(edit, brush, sample,
    { size, opacity: 1, erase: false }, previewColor);
  edit.commit(); paintSurface(canvas, surface);
}

function paintSurface(canvas: HTMLCanvasElement, surface: RasterSurface): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  surface.visitTiles(({ x, y }, bytes) => {
    context.putImageData(new ImageData(new Uint8ClampedArray(bytes), 64, 64), x * 64, y * 64);
  });
}

export function renderCompactBrushPreview(
  canvas: HTMLCanvasElement,
  brush: BrushPreset | LoadedBrush
): Uint8ClampedArray | null {
  const size = 80;
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d"); if (!context) return null;
  const pixels = compactBrushPreviewPixels(brush);
  paintCompactBrushPreview(canvas, pixels); return pixels;
}

export function compactBrushPreviewPixels(
  brush: BrushPreset | LoadedBrush
): Uint8ClampedArray {
  const size = 80;
  const surface = new RasterSurface(`compact-preview/${brush.id}`, size, size, size);
  const edit = new RasterEdit(surface, "Compact preview");
  renderShapeSourceStamp(edit, brush, size - 8, size);
  edit.commit();
  return surface.copyTile(0, 0) ?? new Uint8ClampedArray(size * size * 4);
}

export function paintCompactBrushPreview(canvas: HTMLCanvasElement,
  pixels: Uint8ClampedArray): void {
  const size = 80, context = canvas.getContext("2d"); if (!context) return;
  canvas.width = size; canvas.height = size;
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), size, size), 0, 0);
}

function renderTextureStamp(edit: RasterEdit, brush: BrushPreset | LoadedBrush,
  brushSize: number, canvasWidth: number, canvasHeight = canvasWidth): void {
  const displayBrush = { ...brush,
    rendering: { ...brush.rendering, flow: 1, opacity: 1 },
    dynamics: { sizeByPressure: 0, opacityByPressure: 0, tiltToSize: 0 },
    properties: { ...brush.properties, minimumSize: 1, maximumSize: canvasWidth } };
  renderBrushDab(edit, displayBrush,
    { x: canvasWidth / 2, y: canvasHeight / 2,
      pressure: Math.max(brush.preview.pressureMinimum,
        Math.min(1, brush.preview.pressureScale)),
      tiltX: brush.preview.tiltAngle * 90, tiltY: 0, time: 0,
      pointerType: "pen" },
    { size: brushSize, opacity: 1, erase: false }, previewColor);
}

function renderShapeSourceStamp(edit: RasterEdit, brush: BrushPreset | LoadedBrush,
  brushSize: number, canvasWidth: number): void {
  const displayBrush = { ...brush,
    shape: { ...brush.shape, angle: 0, roundness: 1, inputStyle: "touch" as const,
      relativeToStroke: false, rotation: 0, scatter: 0, count: 1, countJitter: 0,
      randomized: false, flipX: false, flipY: false },
    grain: { ...brush.grain, strength: 0 },
    rendering: { ...brush.rendering, flow: 1, opacity: 1 },
    dynamics: { sizeByPressure: 0, opacityByPressure: 0, tiltToSize: 0 },
    properties: { ...brush.properties, minimumSize: 1, maximumSize: canvasWidth } };
  renderBrushDab(edit, displayBrush,
    { x: canvasWidth / 2, y: canvasWidth / 2, pressure: 1,
      tiltX: 0, tiltY: 0, time: 0, pointerType: "pen" },
    { size: brushSize, opacity: 1, erase: false }, previewColor);
}
