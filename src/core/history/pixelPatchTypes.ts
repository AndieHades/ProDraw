export type PixelCell = number[] | null | undefined;
export type LegacyPixelGrid = PixelCell[][];

export interface PixelBounds {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

export interface LayerPixelPatch {
  readonly layerIndex: number;
  readonly width: number;
  readonly height: number;
  readonly promote: boolean;
  readonly cells: Map<number, PixelCell>;
  bounds: PixelBounds;
  snapshot?: LegacyPixelGrid;
}

export interface SinglePixelPatch extends LayerPixelPatch {
  readonly kind: "pixel-patch";
}

export interface PixelBatch {
  readonly kind: "pixel-batch";
  readonly width: number;
  readonly height: number;
  readonly patches: LayerPixelPatch[];
}

export type PixelEntry = SinglePixelPatch | PixelBatch;

export interface PixelHistoryLayer {
  grid: LegacyPixelGrid;
}

export type PixelDirtyCallback = (
  layerIndex: number,
  bounds?: PixelBounds
) => void;
