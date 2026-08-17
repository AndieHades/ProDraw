import type { BrushTaperSettings } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { DEFAULT_TAPER } from "../../config/brushDefaults.ts";

export interface TaperResponse {
  readonly sizeScale: number;
  readonly opacityScale: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function taperResponse(settings: BrushTaperSettings, travelled: number,
  size: number, pressure: number, pointerType: StrokeSample["pointerType"]): TaperResponse {
  const touch = pointerType !== undefined && pointerType !== "pen";
  const start = touch ? settings.touchStart ?? DEFAULT_TAPER.touchStart :
    settings.start ?? DEFAULT_TAPER.start;
  const end = touch ? settings.touchEnd ?? DEFAULT_TAPER.touchEnd :
    settings.end ?? DEFAULT_TAPER.end;
  const taperSize = touch ? settings.touchSize ?? DEFAULT_TAPER.touchSize :
    settings.size ?? DEFAULT_TAPER.size;
  const taperOpacity = touch ? settings.touchOpacity ?? DEFAULT_TAPER.touchOpacity :
    settings.opacity ?? DEFAULT_TAPER.opacity;
  const tip = touch ? settings.touchTip ?? DEFAULT_TAPER.touchTip :
    settings.tip ?? DEFAULT_TAPER.tip;
  const linked = touch ? settings.touchLinkTipSizes ?? DEFAULT_TAPER.touchLinkTipSizes :
    settings.linkTipSizes ?? DEFAULT_TAPER.linkTipSizes;
  const startDistance = Math.max(1, start * size * 4);
  const startAmount = start > 0
    ? 1 - Math.min(1, travelled / startDistance) : 0;
  const endLength = linked ? start : end;
  const endAmount = endLength * (1 - clamp01(pressure));
  const rawAmount = Math.max(startAmount, endAmount);
  const sharpness = 1 + tip * 5;
  const animatedSharpness = (settings.tipAnimation ?? DEFAULT_TAPER.tipAnimation)
    ? sharpness * 0.8 : sharpness;
  const amount = Math.pow(clamp01(rawAmount), animatedSharpness);
  const pressureRelief = 1 - (settings.pressure ?? DEFAULT_TAPER.pressure) *
    (1 - clamp01(pressure)) * 0.75;
  return {
    sizeScale: Math.max(0.02, 1 - amount * taperSize * pressureRelief),
    opacityScale: Math.max(0.01, 1 - amount * taperOpacity * pressureRelief)
  };
}
