import type { CanvasPreset, CanvasValidation } from "../contracts/canvasPreset";
import { RASTER_LIMITS } from "./raster";

const screen = (id: string, label: string, width: number, height: number): CanvasPreset =>
  ({ id, label, width, height, dpi: 72, category: "screen" });
const print = (id: string, label: string, width: number, height: number): CanvasPreset =>
  ({ id, label, width, height, dpi: 300, category: "print" });
const social = (id: string, label: string, width: number, height: number): CanvasPreset =>
  ({ id, label, width, height, dpi: 72, category: "social" });
const art = (id: string, side: number): CanvasPreset =>
  ({ id, label: `${side} × ${side}`, width: side, height: side,
    dpi: 72, category: "art" });

export const CANVAS_PRESETS: readonly CanvasPreset[] = Object.freeze([
  screen("fhd", "Full HD", 1920, 1080),
  screen("fhd-tall", "WUXGA", 1920, 1200),
  screen("qhd", "QHD", 2560, 1440),
  screen("qhd-tall", "WQXGA", 2560, 1600),
  screen("uhd", "4K UHD", 3840, 2160),
  print("a5-p", "A5 · портрет", 1748, 2480),
  print("a5-l", "A5 · альбом", 2480, 1748),
  print("a4-p", "A4 · портрет", 2480, 3508),
  print("a4-l", "A4 · альбом", 3508, 2480),
  social("instagram-square", "Instagram · пост 1:1", 1080, 1080),
  social("instagram-portrait", "Instagram · пост 4:5", 1080, 1350),
  social("reels", "Reels / Stories · 9:16", 1080, 1920),
  art("art-2k", 2048),
  art("art-4k", 4096)
]);

export function validateCanvasSize(width: number, height: number): CanvasValidation {
  const integers = Number.isInteger(width) && Number.isInteger(height);
  const sideValid = integers && width > 0 && height > 0 &&
    width <= RASTER_LIMITS.maximumSide && height <= RASTER_LIMITS.maximumSide;
  const pixels = integers && width > 0 && height > 0 ? width * height : 0;
  if (!sideValid) return { valid: false, reason: "side", pixels };
  if (pixels > RASTER_LIMITS.maximumPixels) {
    return { valid: false, reason: "pixels", pixels };
  }
  return { valid: true, reason: null, pixels };
}
