import type { RasterSize } from "./raster";

export type CanvasPresetCategory = "screen" | "print" | "social" | "art";

export interface CanvasPreset extends RasterSize {
  readonly id: string;
  readonly labelKey: string;
  readonly dpi: number;
  readonly category: CanvasPresetCategory;
}

export interface CanvasValidation {
  readonly valid: boolean;
  readonly reason: "side" | "pixels" | null;
  readonly pixels: number;
}
