import type { PsdBlendMode } from "../../contracts/psdImport.ts";
import { blendPixel } from "./blendMode.ts";

interface Color { readonly r?: number; readonly g?: number; readonly b?: number }
interface ColorStop { readonly location?: number; readonly color?: Color }
interface OpacityStop { readonly location?: number; readonly opacity?: number }
interface OverlayParams {
  readonly color?: string;
  readonly blendMode?: PsdBlendMode;
  readonly angle?: number;
  readonly type?: "linear" | "radial" | "angle" | "reflected" | "diamond";
  readonly scale?: number;
  readonly reverse?: boolean;
  readonly offset?: Readonly<{ x?: number; y?: number }>;
  readonly gradient?: Readonly<{ colorStops?: readonly ColorStop[];
    opacityStops?: readonly OpacityStop[] }>;
}
interface OverlayEffect { readonly type: "colorOverlay" | "gradientOverlay";
  readonly visible?: boolean; readonly opacity?: number; readonly params: OverlayParams }
type Rgb = readonly [number, number, number];
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const location = (value = 0): number => value > 1 ? value / 4096 : value;
const rgb = (color: Color = {}): Rgb => [color.r ?? 0, color.g ?? 0, color.b ?? 0];

function colorStops(properties: OverlayParams): readonly { at: number; color: Rgb }[] {
  const entries = properties.gradient?.colorStops ?? [];
  return entries.length ? entries.map((stop) => ({ at: location(stop.location),
    color: rgb(stop.color) })).sort((a, b) => a.at - b.at)
    : [{ at: 0, color: [0, 0, 0] }, { at: 1, color: [255, 255, 255] }];
}

function colorAt(entries: readonly { at: number; color: Rgb }[], t: number): Rgb {
  if (t <= entries[0]!.at) return entries[0]!.color;
  const last = entries.at(-1)!; if (t >= last.at) return last.color;
  const right = entries.findIndex((entry) => entry.at >= t);
  const a = entries[right - 1]!, b = entries[right]!;
  const mix = (t - a.at) / Math.max(0.0001, b.at - a.at);
  return a.color.map((value, index) => Math.round(value +
    (b.color[index]! - value) * mix)) as unknown as Rgb;
}

function opacityAt(properties: OverlayParams, t: number): number {
  const entries = (properties.gradient?.opacityStops ?? []).map((stop) => ({
    at: location(stop.location), value: clamp(stop.opacity ?? 1),
  })).sort((a, b) => a.at - b.at);
  if (!entries.length) return 1;
  if (t <= entries[0]!.at) return entries[0]!.value;
  const last = entries.at(-1)!; if (t >= last.at) return last.value;
  const right = entries.findIndex((entry) => entry.at >= t);
  const a = entries[right - 1]!, b = entries[right]!;
  return a.value + (b.value - a.value) * (t - a.at) / Math.max(0.0001, b.at - a.at);
}

function gradientPosition(p: OverlayParams, x: number, y: number,
  width: number, height: number): number {
  const nx = (x + 0.5) / width - 0.5 - (p.offset?.x ?? 0) / 100;
  const ny = (y + 0.5) / height - 0.5 - (p.offset?.y ?? 0) / 100;
  const angle = (p.angle ?? 90) * Math.PI / 180;
  const scale = Math.max(0.01, (p.scale ?? 100) / 100);
  const projection = (nx * Math.cos(angle) - ny * Math.sin(angle)) / scale;
  let t = projection + 0.5;
  if (p.type === "radial") t = Math.hypot(nx, ny) * 2 / scale;
  else if (p.type === "angle") t = (Math.atan2(ny, nx) - angle) / (Math.PI * 2) + 0.5;
  else if (p.type === "reflected") t = Math.abs(projection) * 2;
  else if (p.type === "diamond") t = (Math.abs(nx) + Math.abs(ny)) / scale;
  t = p.type === "angle" ? (t % 1 + 1) % 1 : clamp(t);
  return p.reverse ? 1 - t : t;
}

function overlay(effect: OverlayEffect, x: number, y: number,
  width: number, height: number): readonly number[] {
  if (effect.type === "colorOverlay") {
    const hex = effect.params.color ?? "#000000";
    return [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  }
  const t = gradientPosition(effect.params, x, y, width, height);
  return [...colorAt(colorStops(effect.params), t), Math.round(opacityAt(effect.params, t) * 255)];
}

export function applyPsdOverlays(data: Uint8ClampedArray, width: number,
  height: number, effects: readonly OverlayEffect[]): void {
  const overlays = effects.filter((effect) => effect.visible !== false &&
    (effect.type === "colorOverlay" || effect.type === "gradientOverlay"));
  for (const effect of overlays) for (let index = 0; index < data.length; index += 4) {
    if (!data[index + 3]) continue;
    const value = overlay(effect, (index / 4) % width, Math.floor(index / 4 / width),
      width, height), alpha = value[3] ?? 255;
    const result = blendPixel([data[index]!, data[index + 1]!, data[index + 2]!, 255],
      [value[0]!, value[1]!, value[2]!, alpha], effect.opacity ?? 1,
      effect.params.blendMode ?? "normal");
    data[index] = result[0]; data[index + 1] = result[1]; data[index + 2] = result[2];
  }
}
