export interface PackedRgbaBounds {
  readonly minx: number;
  readonly miny: number;
  readonly maxx: number;
  readonly maxy: number;
}

export interface PackedRgbaRowRecord {
  readonly y: number;
  readonly left: number;
  readonly bytes: Uint8ClampedArray;
  readonly opaquePixels: number;
}

export interface PackedRgbaGridRecord {
  readonly format: "rgba-rows-v1";
  readonly width: number;
  readonly height: number;
  readonly rows: readonly PackedRgbaRowRecord[];
  readonly bounds: PackedRgbaBounds | null;
  readonly opaquePixels: number;
}
