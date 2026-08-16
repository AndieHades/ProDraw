import type { BrushPreset } from "../../contracts/brush";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { RasterEdit } from "../../core/history/RasterEdit";
import { RasterSurface } from "../../core/raster/RasterSurface";

export function renderBrushPreview(canvas: HTMLCanvasElement, brush: BrushPreset): void {
  const width = 180;
  const height = 44;
  canvas.width = width;
  canvas.height = height;
  const surface = new RasterSurface(`preview/${brush.id}`, width, height, 64);
  const edit = new RasterEdit(surface, "Preview");
  for (let index = 0; index <= 24; index += 1) {
    const amount = index / 24;
    renderBrushDab(edit, brush, {
      x: 8 + amount * (width - 16), y: height / 2 + Math.sin(amount * Math.PI) * 3,
      pressure: 0.18 + amount * 0.82, tiltX: 0, tiltY: 0, time: index
    }, { size: 7 + amount * 15, opacity: 1, erase: false },
    { red: 245, green: 245, blue: 248, alpha: 255 });
  }
  edit.commit();
  const context = canvas.getContext("2d");
  if (!context) return;
  surface.visitTiles(({ x, y }, bytes) => {
    context.putImageData(new ImageData(new Uint8ClampedArray(bytes), 64, 64), x * 64, y * 64);
  });
}
