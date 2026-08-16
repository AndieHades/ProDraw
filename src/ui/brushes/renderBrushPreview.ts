import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { RasterEdit } from "../../core/history/RasterEdit";
import { RasterSurface } from "../../core/raster/RasterSurface";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";

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
  const pipeline = new StrokePipeline(brush, 22);
  for (let index = 0; index <= 24; index += 1) {
    const amount = index / 24;
    const source = {
      x: 8 + amount * (width - 16), y: height / 2 + Math.sin(amount * Math.PI) * 3,
      pressure: 0.18 + amount * 0.82, tiltX: 0, tiltY: 0, time: index
    };
    for (const sample of pipeline.push(source)) renderBrushDab(edit, brush, sample,
      { size: 22, opacity: 1, erase: false },
      { red: 245, green: 245, blue: 248, alpha: 255 });
  }
  for (const sample of pipeline.finish()) renderBrushDab(edit, brush, sample,
    { size: 22, opacity: 1, erase: false },
    { red: 245, green: 245, blue: 248, alpha: 255 });
  edit.commit();
  const context = canvas.getContext("2d");
  if (!context) return;
  surface.visitTiles(({ x, y }, bytes) => {
    context.putImageData(new ImageData(new Uint8ClampedArray(bytes), 64, 64), x * 64, y * 64);
  });
}
