export interface RgbaColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export interface TileCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface PixelCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface RasterSize {
  readonly width: number;
  readonly height: number;
}

export type BlendMode = "normal";
