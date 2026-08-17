export type BrushFilteringMode = "none" | "classic" | "improved";
export type BrushInputStyle = "touch" | "azimuth" | "azimuth-roll";
export type BrushGrainBehavior = "moving" | "texturized";
export type BrushRenderingMode = "light-glaze" | "uniform-glaze" |
  "intense-glaze" | "heavy-glaze" | "uniform-blending" | "intense-blending";

export interface BrushTaperSettings {
  readonly start: number;
  readonly end: number;
  readonly pressure: number;
  readonly size: number;
  readonly opacity: number;
  readonly tip: number;
  readonly tipAnimation: boolean;
  readonly linkTipSizes: boolean;
  readonly touchStart: number;
  readonly touchEnd: number;
  readonly touchSize: number;
  readonly touchOpacity: number;
  readonly touchTip: number;
  readonly touchLinkTipSizes: boolean;
}

export interface BrushShapeSettings {
  readonly hardness: number;
  readonly angle: number;
  readonly roundness: number;
  readonly sourceName?: string;
  readonly inputStyle: BrushInputStyle;
  readonly relativeToStroke: boolean;
  readonly rotation: number;
  readonly count: number;
  readonly countJitter: number;
  readonly randomized: boolean;
  readonly flipX: boolean;
  readonly flipY: boolean;
  readonly pressureRoundness: number;
  readonly tiltRoundness: number;
  readonly horizontalJitter: number;
  readonly verticalJitter: number;
  readonly filtering: BrushFilteringMode;
}

export interface BrushGrainSettings {
  readonly strength: number;
  readonly scale: number;
  readonly sourceName?: string;
  readonly behavior: BrushGrainBehavior;
  readonly movement: number;
  readonly zoom: number;
  readonly rotation: number;
  readonly minimumDepth: number;
  readonly depthJitter: number;
  readonly offsetJitter: boolean;
  readonly brightness: number;
  readonly contrast: number;
  readonly filtering: BrushFilteringMode;
}

export interface BrushRenderingSettings {
  readonly flow: number;
  readonly opacity: number;
  readonly mode: BrushRenderingMode;
}

export interface BrushPropertySettings {
  readonly maximumSize: number;
  readonly minimumSize: number;
  readonly maximumOpacity: number;
  readonly minimumOpacity: number;
  readonly orientToScreen: boolean;
}

export interface BrushPreviewSettings {
  readonly stamp: boolean;
  readonly size: number;
  readonly pressureMinimum: number;
  readonly pressureScale: number;
  readonly tiltAngle: number;
}
