import { normalizeTextSource } from "./text-model.ts";
import type { TextBox, TextSource } from "./text-model.ts";

export interface TextPoint { readonly x: number; readonly y: number }
export type TextFrameSide = "l" | "r" | "t" | "b" | "tl" | "tr" | "bl" | "br";
export interface TextRasterBounds { readonly x: number; readonly y: number;
  readonly width: number; readonly height: number; readonly minx: number;
  readonly miny: number; readonly maxx: number; readonly maxy: number }
const RASTER_PADDING = 2;

export function textFramePoints(value: unknown): TextPoint[] {
  const source = normalizeTextSource(value), box = source.box, transform = source.transform;
  const centerX = box.x + box.w / 2 + transform.x;
  const centerY = box.y + box.h / 2 + transform.y;
  const cosine = Math.cos(transform.rotation), sine = Math.sin(transform.rotation);
  return [[-box.w / 2, -box.h / 2], [box.w / 2, -box.h / 2],
    [box.w / 2, box.h / 2], [-box.w / 2, box.h / 2]].map(([x = 0, y = 0]) => ({
    x: centerX + x * transform.scaleX * cosine - y * transform.scaleY * sine,
    y: centerY + x * transform.scaleX * sine + y * transform.scaleY * cosine
  }));
}
export function textRasterBounds(value: unknown, width: number,
  height: number): TextRasterBounds | null {
  const points = textFramePoints(value);
  const x = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))) -
    RASTER_PADDING);
  const y = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))) -
    RASTER_PADDING);
  const right = Math.min(width, Math.ceil(Math.max(...points.map((point) => point.x))) +
    RASTER_PADDING);
  const bottom = Math.min(height, Math.ceil(Math.max(...points.map((point) => point.y))) +
    RASTER_PADDING);
  return right <= x || bottom <= y ? null : { x, y, width: right - x,
    height: bottom - y, minx: x, miny: y, maxx: right - 1, maxy: bottom - 1 };
}
export function textLocalPoint(value: unknown, x: number, y: number): TextPoint {
  const source = normalizeTextSource(value), box = source.box, transform = source.transform;
  const centerX = box.x + box.w / 2 + transform.x;
  const centerY = box.y + box.h / 2 + transform.y;
  const cosine = Math.cos(-transform.rotation), sine = Math.sin(-transform.rotation);
  const dx = x - centerX, dy = y - centerY;
  return { x: (dx * cosine - dy * sine) / transform.scaleX + box.w / 2,
    y: (dx * sine + dy * cosine) / transform.scaleY + box.h / 2 };
}
export function textFrameHit(value: unknown, x: number, y: number,
  tolerance: number): TextFrameSide | null {
  const source = normalizeTextSource(value), point = textLocalPoint(source, x, y);
  const box = source.box, left = Math.abs(point.x) <= tolerance;
  const right = Math.abs(point.x - box.w) <= tolerance;
  const top = Math.abs(point.y) <= tolerance, bottom = Math.abs(point.y - box.h) <= tolerance;
  if (point.x < -tolerance || point.x > box.w + tolerance || point.y < -tolerance ||
    point.y > box.h + tolerance) return null;
  if ((left || right) && (top || bottom))
    return `${top ? "t" : "b"}${left ? "l" : "r"}` as TextFrameSide;
  if (left) return "l"; if (right) return "r";
  if (top) return "t"; if (bottom) return "b"; return null;
}
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
export function resizeTextBox(value: unknown, original: TextBox, side: TextFrameSide,
  x: number, y: number): TextBox {
  const point = textLocalPoint(value, x, y), next = { ...original };
  if (side.includes("l")) {
    const delta = clamp(Math.round(point.x), 0, original.w - 1);
    next.x = original.x + delta; next.w = original.w - delta;
  }
  if (side.includes("r")) next.w = Math.max(1, Math.round(point.x));
  if (side.includes("t")) {
    const delta = clamp(Math.round(point.y), 0, original.h - 1);
    next.y = original.y + delta; next.h = original.h - delta;
  }
  if (side.includes("b")) next.h = Math.max(1, Math.round(point.y));
  return next;
}
export const asTextSource = (value: unknown): TextSource => normalizeTextSource(value);
