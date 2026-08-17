import { clamp } from "../../logic/math.ts";
import { viewportHeight, viewportWidth } from "./FloatingWindowRegistry.ts";
import type { SizeLimit } from "./FloatingWindowTypes.ts";

export const resolveLimit = (limit: SizeLimit): number =>
  typeof limit === "function" ? limit() : limit;

export function placeWindow(
  element: HTMLElement, left: number, top: number, clampRight: number, clampBottom: number
): void {
  element.style.left = `${Math.max(4, Math.min(left, viewportWidth() - clampRight))}px`;
  element.style.top = `${Math.max(4, Math.min(top, viewportHeight() - clampBottom))}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.transform = "none";
}

export function clampWindowSize(
  width: number, height: number, minW: SizeLimit, minH: SizeLimit
): { width: number; height: number } {
  const minimumWidth = resolveLimit(minW);
  const minimumHeight = resolveLimit(minH);
  return {
    width: clamp(width, minimumWidth, Math.max(minimumWidth, viewportWidth() - 12)),
    height: clamp(height, minimumHeight, Math.max(minimumHeight, viewportHeight() - 12))
  };
}

export function positionWindow(element: HTMLElement, left: number, top: number): void {
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.transform = "none";
}
