import type { CanvasPreset, CanvasValidation } from "../contracts/canvasPreset";
import { RASTER_LIMITS } from "./raster";
import presetData from "./canvas-presets.json" with { type: "json" };

const categories = new Set<CanvasPreset["category"]>([
  "screen", "print", "social", "art"
]);

function readPreset(value: (typeof presetData)[number]): CanvasPreset {
  if (!categories.has(value.category as CanvasPreset["category"])) {
    throw new Error(`Unknown canvas preset category: ${value.category}`);
  }
  if (!value.labelKey.startsWith("canvasPreset.")) {
    throw new Error(`Unknown canvas preset label: ${value.labelKey}`);
  }
  return { ...value, category: value.category as CanvasPreset["category"] };
}

export const CANVAS_PRESETS: readonly CanvasPreset[] = Object.freeze(
  presetData.map(readPreset)
);

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
