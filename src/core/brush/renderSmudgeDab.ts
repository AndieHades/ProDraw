import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { SmudgeRenderSettings, StrokeSample } from "../../contracts/stroke";
import { mixColor } from "../../logic/raster/colorComposite";
import { brushTexture, brushTipCoverage } from "../../logic/brush/brushCoverage";
import type { RasterEdit } from "../history/RasterEdit";
import { pressureBrushSize } from "./renderBrushDab";

export interface SmudgeState {
  carried: RgbaColor | null;
}

interface DabBounds {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
  readonly radius: number;
}

function bounds(
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  settings: SmudgeRenderSettings
): DabBounds {
  const radius = pressureBrushSize(brush,
    { size: settings.size, opacity: 1, erase: false }, sample.pressure) / 2;
  return { minimumX: Math.floor(sample.x - radius - 1),
    maximumX: Math.ceil(sample.x + radius + 1),
    minimumY: Math.floor(sample.y - radius - 1),
    maximumY: Math.ceil(sample.y + radius + 1), radius };
}

function coverage(
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  area: DabBounds,
  x: number,
  y: number
): number {
  const normalizedX = (x + 0.5 - sample.x) / area.radius;
  const normalizedY = (y + 0.5 - sample.y) / area.radius;
  return brushTipCoverage(brush, normalizedX, normalizedY) * brushTexture(brush, x, y);
}

function pickupColor(
  edit: RasterEdit,
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  area: DabBounds
): RgbaColor {
  let weight = 0;
  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let y = area.minimumY; y <= area.maximumY; y += 1) {
    for (let x = area.minimumX; x <= area.maximumX; x += 1) {
      const amount = coverage(brush, sample, area, x, y);
      if (amount <= 0) continue;
      const color = edit.getPixel(x, y);
      const opacity = color.alpha / 255;
      weight += amount;
      alpha += opacity * amount;
      red += color.red * opacity * amount;
      green += color.green * opacity * amount;
      blue += color.blue * opacity * amount;
    }
  }
  if (weight === 0 || alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return { red: Math.round(red / alpha), green: Math.round(green / alpha),
    blue: Math.round(blue / alpha), alpha: Math.round(alpha / weight * 255) };
}

export function renderSmudgeDab(
  edit: RasterEdit,
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  settings: SmudgeRenderSettings,
  state: SmudgeState
): void {
  const area = bounds(brush, sample, settings);
  const picked = pickupColor(edit, brush, sample, area);
  if (!state.carried) { state.carried = picked; return; }
  const pigment = mixColor(picked, state.carried, settings.pull);
  const pressure = 0.2 + sample.pressure * 0.8;
  for (let y = area.minimumY; y <= area.maximumY; y += 1) {
    for (let x = area.minimumX; x <= area.maximumX; x += 1) {
      const amount = coverage(brush, sample, area, x, y) *
        settings.strength * settings.flow * pressure;
      if (amount <= 0) continue;
      edit.setPixel(x, y, mixColor(edit.getPixel(x, y), pigment, amount));
    }
  }
  state.carried = mixColor(state.carried, picked, settings.pickup);
}
