import type { BlendMode, RasterSize } from "./raster";

export interface DocumentDescriptor extends RasterSize {
  readonly id: string;
  readonly name: string;
  readonly dpi: number;
}

export interface LayerDescriptor {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly blendMode: BlendMode;
}

export interface DocumentSnapshot extends DocumentDescriptor {
  readonly activeLayerId: string;
  readonly layers: readonly LayerDescriptor[];
}
