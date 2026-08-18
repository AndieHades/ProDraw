import type {
  BrushGrainSettings, BrushPreviewSettings, BrushPropertySettings,
  BrushRenderingSettings, BrushShapeSettings, BrushTaperSettings
} from "../contracts/brush";

export const DEFAULT_TAPER: BrushTaperSettings = {
  start: 0, end: 0, pressure: 0, size: 1, opacity: 1, tip: 0,
  tipAnimation: false, linkTipSizes: false, touchStart: 0, touchEnd: 0,
  touchSize: 1, touchOpacity: 1, touchTip: 0, touchLinkTipSizes: false
};

export const DEFAULT_SHAPE: BrushShapeSettings = {
  hardness: 0.8, angle: 0, roundness: 1, inputStyle: "touch",
  relativeToStroke: false, rotation: 0, scatter: 0, count: 1, countJitter: 0,
  randomized: false, flipX: false, flipY: false, pressureRoundness: 0,
  tiltRoundness: 0, horizontalJitter: 0, verticalJitter: 0,
  filtering: "improved"
};

export const DEFAULT_GRAIN: BrushGrainSettings = {
  strength: 0, scale: 1, behavior: "moving", movement: 1, zoom: 1,
  rotation: 0, minimumDepth: 0, depthJitter: 0, offsetJitter: false,
  brightness: 0, contrast: 0, filtering: "classic"
};

export const DEFAULT_RENDERING: BrushRenderingSettings = {
  flow: 1, opacity: 1, mode: "intense-blending"
};

export const DEFAULT_PROPERTIES: BrushPropertySettings = {
  maximumSize: 500, minimumSize: 1, maximumOpacity: 1,
  minimumOpacity: 0, orientToScreen: false
};

export const DEFAULT_PREVIEW: BrushPreviewSettings = {
  stamp: false, size: 1, pressureMinimum: 0, pressureScale: 1, tiltAngle: 0
};
