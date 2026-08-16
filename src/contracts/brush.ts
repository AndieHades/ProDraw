export interface CoverageMap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array<ArrayBuffer>;
}

export interface BrushStrokePath {
  readonly spacing: number;
  readonly spacingJitter: number;
  readonly lateralJitter: number;
  readonly linearJitter: number;
  readonly fallOff: number;
  readonly scatter: number;
}

export interface BrushStabilization {
  readonly streamlineAmount: number;
  readonly streamlinePressure: number;
  readonly stabilizationAmount: number;
  readonly motionFilteringAmount: number;
  readonly motionFilteringExpression: number;
}

export interface BrushDynamics {
  readonly sizeByPressure: number;
  readonly opacityByPressure: number;
  readonly tiltToSize: number;
}

export interface BrushStylusSettings {
  readonly minimumPressure: number;
  readonly pressureCurve: readonly [number, number, number, number];
  readonly tiltEnabled: boolean;
  readonly barrelAction: "none" | "eraser" | "smudge";
  readonly eraserAction: "eraser" | "smudge";
}

export interface BrushPreset {
  readonly format: "prodraw-brush";
  readonly version: 1;
  readonly revision: number;
  readonly id: string;
  readonly name: string;
  readonly setName: string;
  readonly fileName: string;
  readonly baseFileName: string;
  readonly replacesFileName: string | null;
  readonly sourceUrl: string;
  readonly strokePath: BrushStrokePath;
  readonly stabilization: BrushStabilization;
  readonly taper: { readonly start: number; readonly end: number; readonly pressure: number };
  readonly shape: { readonly hardness: number; readonly angle: number; readonly roundness: number };
  readonly grain: { readonly strength: number; readonly scale: number };
  readonly rendering: { readonly flow: number; readonly opacity: number };
  readonly dynamics: BrushDynamics;
  readonly stylus: BrushStylusSettings;
  readonly properties: { readonly maximumSize: number; readonly minimumSize: number };
}

export interface LoadedBrush extends BrushPreset {
  readonly shapeMap: CoverageMap | null;
  readonly grainMap: CoverageMap | null;
  readonly warnings: readonly string[];
}
