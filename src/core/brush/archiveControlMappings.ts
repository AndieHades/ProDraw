import type {
  BrushGrainSettings, BrushPreviewSettings, BrushPropertySettings,
  BrushRenderingMode, BrushRenderingSettings, BrushShapeSettings,
  BrushTaperSettings
} from "../../contracts/brush";
import type { BinaryPlistValue } from "../archive/binaryPlist";

type Root = Readonly<Record<string, BinaryPlistValue>>;
export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));
export const numeric = (root: Root, key: string, fallback: number): number => {
  const value = root[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
const flag = (root: Root, key: string, fallback: boolean): boolean =>
  typeof root[key] === "boolean" ? root[key] as boolean : fallback;
const radians = (value: number): number => {
  const turn = Math.PI * 2;
  return ((value + Math.PI) % turn + turn) % turn - Math.PI;
};
const filterMode = (enabled: boolean, mode: number) =>
  enabled ? mode === 1 ? "classic" as const : "improved" as const : "none" as const;

export function archiveTaper(root: Root, base: BrushTaperSettings): BrushTaperSettings {
  return {
    start: clamp(numeric(root, "pencilTaperStartLength", base.start), 0, 1),
    end: clamp(numeric(root, "pencilTaperEndLength", base.end), 0, 1),
    pressure: clamp(numeric(root, "taperPressure", base.pressure), 0, 1),
    size: clamp(numeric(root, "pencilTaperSize", base.size), 0, 1),
    opacity: clamp(numeric(root, "pencilTaperOpacity", base.opacity), 0, 1),
    tip: clamp(numeric(root, "pencilTaperShape", base.tip), 0, 1),
    tipAnimation: flag(root, "pencilTipAnimation", base.tipAnimation),
    linkTipSizes: flag(root, "pencilTaperSizeLinked", base.linkTipSizes),
    touchStart: clamp(numeric(root, "taperStartLength", base.touchStart), 0, 1),
    touchEnd: clamp(numeric(root, "taperEndLength", base.touchEnd), 0, 1),
    touchSize: clamp(numeric(root, "taperSize", base.touchSize), 0, 1),
    touchOpacity: clamp(numeric(root, "taperOpacity", base.touchOpacity), 0, 1),
    touchTip: clamp(numeric(root, "taperShape", base.touchTip), 0, 1),
    touchLinkTipSizes: flag(root, "taperSizeLinked", base.touchLinkTipSizes)
  };
}

export function archiveShape(root: Root, base: BrushShapeSettings,
  sourceName: string | undefined): BrushShapeSettings {
  const azimuth = flag(root, "shapeAzimuth", false);
  const roll = flag(root, "shapeRoll", false);
  return { ...base,
    angle: radians(numeric(root, "shapeAngle", base.angle)),
    roundness: clamp(numeric(root, "shapeRoundness", base.roundness), 0.05, 1),
    ...(sourceName ? { sourceName } : {}),
    inputStyle: roll ? "azimuth-roll" : azimuth ? "azimuth" : "touch",
    relativeToStroke: numeric(root, "shapeOrientation", 1) === 0,
    rotation: clamp(numeric(root, "shapeRotation", base.rotation), -1, 1),
    scatter: clamp(numeric(root, "shapeScatter", base.scatter), 0, 1),
    count: Math.max(1, Math.min(16, 1 + Math.round(numeric(root, "shapeCount", 0) * 15))),
    countJitter: clamp(numeric(root, "shapeCountJitter", base.countJitter), 0, 1),
    randomized: flag(root, "shapeRandomise", base.randomized),
    flipX: flag(root, "shapeFlipXJitter", base.flipX),
    flipY: flag(root, "shapeFlipYJitter", base.flipY),
    pressureRoundness: clamp(1 - numeric(root,
      "dynamicsPressureShapeRoundnessMinimum", 1), 0, 1),
    tiltRoundness: clamp(1 - numeric(root,
      "dynamicsTiltShapeRoundnessMinimum", 1), 0, 1),
    horizontalJitter: clamp(numeric(root, "jitterShapeRoundnessX",
      base.horizontalJitter), 0, 1),
    verticalJitter: clamp(numeric(root, "jitterShapeRoundness",
      base.verticalJitter), 0, 1),
    filtering: filterMode(flag(root, "shapeFilter", true),
      numeric(root, "shapeFilterMode", 0)) };
}

export function archiveGrain(root: Root, base: BrushGrainSettings,
  sourceName: string | undefined): BrushGrainSettings {
  const movement = clamp(numeric(root, "textureMovement", base.movement), 0, 1);
  return { ...base, strength: clamp(numeric(root, "grainDepth", base.strength), 0, 1),
    scale: clamp(numeric(root, "textureScale", base.scale), 0.01, 10),
    ...(sourceName ? { sourceName } : {}),
    behavior: movement > 0 ? "moving" : "texturized", movement,
    zoom: clamp(numeric(root, "textureZoom", base.zoom), 0.05, 4),
    rotation: radians(numeric(root, "textureRotation", base.rotation)),
    minimumDepth: clamp(numeric(root, "grainDepthMinimum", base.minimumDepth), 0, 1),
    depthJitter: clamp(numeric(root, "grainDepthJitter", base.depthJitter), 0, 1),
    offsetJitter: flag(root, "textureOffsetJitter", base.offsetJitter),
    brightness: clamp(numeric(root, "textureBrightness", base.brightness), -1, 1),
    contrast: clamp(numeric(root, "textureContrast", base.contrast), -1, 1),
    filtering: filterMode(flag(root, "textureFilter", false),
      numeric(root, "textureFilterMode", 0)) };
}

const RENDER_MODES: readonly BrushRenderingMode[] = ["intense-blending",
  "uniform-blending", "light-glaze", "uniform-glaze", "intense-glaze", "heavy-glaze"];
export function archiveRendering(root: Root,
  base: BrushRenderingSettings): BrushRenderingSettings {
  return { flow: clamp(numeric(root, "dynamicsGlazedFlow", base.flow), 0.01, 1),
    opacity: base.opacity,
    mode: RENDER_MODES[Math.round(numeric(root, "textureApplication", 0))] ?? base.mode };
}

export function archiveProperties(root: Root, base: BrushPropertySettings,
  maximumSize: number, minimumSize: number): BrushPropertySettings {
  return { maximumSize, minimumSize,
    maximumOpacity: clamp(numeric(root, "maxOpacity", base.maximumOpacity), 0, 1),
    minimumOpacity: clamp(numeric(root, "minOpacity", base.minimumOpacity), 0, 1),
    orientToScreen: numeric(root, "shapeOrientation", 1) === 0 };
}

export function archivePreview(root: Root,
  base: BrushPreviewSettings): BrushPreviewSettings {
  return { stamp: flag(root, "previewRenderDisabled", !base.stamp),
    size: clamp(numeric(root, "previewSize", base.size), 0.05, 2),
    pressureMinimum: clamp(numeric(root, "previewPressureMinimum",
      base.pressureMinimum), 0, 1),
    pressureScale: clamp(numeric(root, "previewPressureScale", base.pressureScale), 0, 2),
    tiltAngle: clamp(numeric(root, "previewTiltAngleOffset", base.tiltAngle), -1, 1) };
}
