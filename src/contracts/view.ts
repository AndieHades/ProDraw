import type { PixelCoordinate, RasterSize, RgbaColor } from "./raster";
import type { StrokeSample } from "./stroke";

export interface ViewState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly rotation: number;
}

export type ViewportSize = RasterSize;

export interface StrokePreview {
  readonly samples: readonly StrokeSample[];
  readonly size: number;
  readonly color: RgbaColor;
}

export interface ViewportPort {
  screenToDocument(point: PixelCoordinate): PixelCoordinate;
  requestRender(): void;
  setStrokePreview?(preview: StrokePreview | null): void;
}
