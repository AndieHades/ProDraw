import type { PixelCoordinate, RasterSize } from "./raster";

export interface ViewState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly rotation: number;
}

export type ViewportSize = RasterSize;

export interface ViewportPort {
  screenToDocument(point: PixelCoordinate): PixelCoordinate;
  requestRender(): void;
}
