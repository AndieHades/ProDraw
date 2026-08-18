export interface CoverageMap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array<ArrayBuffer>;
  readonly scaleReference?: number;
}

export type BrushSourceKind = "shape" | "grain";
export type BrushSourceState = "embedded" | "resolved" | "missing";

export interface BrushSourceAsset {
  readonly sourceBrushName: string;
  readonly width: number;
  readonly height: number;
  readonly alphaBase64: string;
  readonly scaleReference?: number;
}

export interface BrushSourceSelection {
  readonly shape: BrushSourceAsset | null;
  readonly grain: BrushSourceAsset | null;
}

export interface BrushSourceResource {
  readonly id: string;
  readonly kind: BrushSourceKind;
  readonly sourceBrushName: string;
  readonly map: CoverageMap;
  readonly asset: BrushSourceAsset;
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

export interface BrushSmudgeSettings {
  readonly flow: number;
  readonly pickup: number;
  readonly pull: number;
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
  readonly taper: BrushTaperSettings;
  readonly shape: BrushShapeSettings;
  readonly grain: BrushGrainSettings;
  readonly rendering: BrushRenderingSettings;
  readonly dynamics: BrushDynamics;
  readonly smudge: BrushSmudgeSettings;
  readonly stylus: BrushStylusSettings;
  readonly properties: BrushPropertySettings;
  readonly preview: BrushPreviewSettings;
  readonly sources: BrushSourceSelection;
}

export interface BrushCompatibilityReport {
  readonly archiveVersion: number | null;
  readonly archiveName: string | null;
  readonly supportedFields: readonly string[];
  readonly unsupportedActiveFields: readonly string[];
  readonly excludedSections: readonly ["wet-mix", "color-dynamics", "materials"];
  readonly shapeSourceState: BrushSourceState;
  readonly grainSourceState: BrushSourceState;
  readonly missingSourceNames: readonly string[];
}

export interface LoadedBrush extends BrushPreset {
  readonly shapeMap: CoverageMap | null;
  readonly grainMap: CoverageMap | null;
  readonly nativeShapeMap: CoverageMap | null;
  readonly nativeGrainMap: CoverageMap | null;
  readonly compatibility: BrushCompatibilityReport;
  readonly warnings: readonly string[];
}
import type {
  BrushGrainSettings, BrushPreviewSettings, BrushPropertySettings,
  BrushRenderingSettings, BrushShapeSettings, BrushTaperSettings
} from "./brushSettings";
export type {
  BrushFilteringMode, BrushGrainBehavior, BrushGrainSettings, BrushInputStyle,
  BrushPreviewSettings, BrushPropertySettings, BrushRenderingMode,
  BrushRenderingSettings, BrushShapeSettings, BrushTaperSettings
} from "./brushSettings";
