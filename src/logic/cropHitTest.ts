import type { CropRect } from "./cropRatio.ts";

export interface CropHitZone {
  readonly b: boolean; readonly inside: boolean; readonly l: boolean;
  readonly r: boolean; readonly t: boolean;
}
export interface CropView { readonly ox: number; readonly oy: number; readonly zoom: number }

export function cropHitTest(
  clientX: number, clientY: number, canvas: DOMRect, view: CropView, crop: CropRect,
  tolerance = 24
): CropHitZone {
  const x = clientX - canvas.left, y = clientY - canvas.top;
  const left = view.ox + crop.x0 * view.zoom;
  const right = view.ox + (crop.x1 + 1) * view.zoom;
  const top = view.oy + crop.y0 * view.zoom;
  const bottom = view.oy + (crop.y1 + 1) * view.zoom;
  const nearLeft = Math.abs(x - left) < tolerance;
  const nearRight = Math.abs(x - right) < tolerance;
  const nearTop = Math.abs(y - top) < tolerance;
  const nearBottom = Math.abs(y - bottom) < tolerance;
  const inX = x > left - tolerance && x < right + tolerance;
  const inY = y > top - tolerance && y < bottom + tolerance;
  return { l: nearLeft && inY, r: nearRight && inY, t: nearTop && inX,
    b: nearBottom && inX, inside: x > left && x < right && y > top && y < bottom };
}

export function cropCursor(zone: CropHitZone): string {
  const horizontal = zone.l || zone.r, vertical = zone.t || zone.b;
  if (horizontal && vertical) return (zone.l && zone.t) || (zone.r && zone.b) ?
    "nwse-resize" : "nesw-resize";
  if (horizontal) return "ew-resize";
  if (vertical) return "ns-resize";
  return zone.inside ? "move" : "";
}
