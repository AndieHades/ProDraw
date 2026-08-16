import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { BrushRenderSettings, StrokeSample } from "../../contracts/stroke";
import { brushTexture, brushTipCoverage } from "../../logic/brush/brushCoverage";
import type { RasterEdit } from "../history/RasterEdit";

export function pressureBrushSize(
  brush: BrushPreset | LoadedBrush,
  settings: BrushRenderSettings,
  pressure: number
): number {
  const response = 1 - brush.dynamics.sizeByPressure +
    brush.dynamics.sizeByPressure * pressure;
  return Math.max(1, settings.size * response);
}

export function renderBrushDab(
  edit: RasterEdit,
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  settings: BrushRenderSettings,
  color: RgbaColor
): void {
  const size = pressureBrushSize(brush, settings, sample.pressure);
  const radius = size / 2;
  const minimumX = Math.floor(sample.x - radius - 1);
  const maximumX = Math.ceil(sample.x + radius + 1);
  const minimumY = Math.floor(sample.y - radius - 1);
  const maximumY = Math.ceil(sample.y + radius + 1);
  const pressureOpacity = 1 - brush.dynamics.opacityByPressure +
    brush.dynamics.opacityByPressure * sample.pressure;
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const normalizedX = (x + 0.5 - sample.x) / radius;
      const normalizedY = (y + 0.5 - sample.y) / radius;
      const coverage = brushTipCoverage(brush, normalizedX, normalizedY);
      if (coverage <= 0) continue;
      const opacity = settings.opacity * brush.flow * pressureOpacity * coverage *
        brushTexture(brush, x, y);
      if (settings.erase) edit.erasePixel(x, y, opacity);
      else edit.blendPixel(x, y, color, opacity);
    }
  }
}
