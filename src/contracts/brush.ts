export interface CoverageMap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array<ArrayBuffer>;
}

export interface BrushDynamics {
  readonly sizeByPressure: number;
  readonly opacityByPressure: number;
}

export interface BrushPreset {
  readonly id: string;
  readonly name: string;
  readonly fileName: string;
  readonly sourceUrl: string;
  readonly spacing: number;
  readonly scatter: number;
  readonly hardness: number;
  readonly flow: number;
  readonly texture: number;
  readonly dynamics: BrushDynamics;
}

export interface LoadedBrush extends BrushPreset {
  readonly shape: CoverageMap | null;
  readonly grain: CoverageMap | null;
  readonly warnings: readonly string[];
}
