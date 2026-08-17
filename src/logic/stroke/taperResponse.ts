import type { BrushTaperSettings } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";

export interface TaperResponse {
  readonly sizeScale: number;
  readonly opacityScale: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function taperResponse(settings: BrushTaperSettings, travelled: number,
  size: number, pressure: number, pointerType: StrokeSample["pointerType"]): TaperResponse {
  const touch = pointerType !== undefined && pointerType !== "pen";
  const start = touch ? settings.touchStart : settings.start;
  const end = touch ? settings.touchEnd : settings.end;
  const taperSize = touch ? settings.touchSize : settings.size;
  const taperOpacity = touch ? settings.touchOpacity : settings.opacity;
  const tip = touch ? settings.touchTip : settings.tip;
  const linked = touch ? settings.touchLinkTipSizes : settings.linkTipSizes;
  const startDistance = Math.max(1, start * size * 4);
  const startAmount = start > 0
    ? 1 - Math.min(1, travelled / startDistance) : 0;
  const endLength = linked ? start : end;
  const endAmount = endLength * (1 - clamp01(pressure));
  const rawAmount = Math.max(startAmount, endAmount);
  const sharpness = 1 + tip * 5;
  const animatedSharpness = settings.tipAnimation ? sharpness * 0.8 : sharpness;
  const amount = Math.pow(clamp01(rawAmount), animatedSharpness);
  const pressureRelief = 1 - settings.pressure * (1 - clamp01(pressure)) * 0.75;
  return {
    sizeScale: Math.max(0.02, 1 - amount * taperSize * pressureRelief),
    opacityScale: Math.max(0.01, 1 - amount * taperOpacity * pressureRelief)
  };
}
