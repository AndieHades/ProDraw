import { bcAdjust, contrastFactor } from "./bc.ts";
import { hsvToRgb, rgbToHsv } from "./color.ts";
import type { ColorChannels } from "./color.ts";
import { clamp } from "./math.ts";

export interface AdjustmentParams {
  readonly brightness: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly hue: number;
}
type PartialAdjustment = Partial<Record<keyof AdjustmentParams, unknown>>;
const numeric = (value: unknown): number => Number(value) || 0;

export function adjustColor(color: ColorChannels,
  params: PartialAdjustment = {}): number[] {
  const brightness = numeric(params.brightness), contrast = numeric(params.contrast);
  const saturation = numeric(params.saturation), hue = numeric(params.hue);
  let output = bcAdjust(color, brightness * 1.27, contrastFactor(contrast * 1.27));
  if (saturation || hue) {
    const [h, s, v] = rgbToHsv(output[0] ?? 0, output[1] ?? 0, output[2] ?? 0);
    const adjusted = hsvToRgb(h + hue, clamp(s + saturation, 0, 100), v);
    output = output.length > 3 ? [...adjusted, output[3] ?? 0] : [...adjusted];
  }
  return output;
}

export function adjustmentParams(params: PartialAdjustment = {}): AdjustmentParams {
  return { brightness: numeric(params.brightness), contrast: numeric(params.contrast),
    saturation: numeric(params.saturation), hue: numeric(params.hue) };
}
