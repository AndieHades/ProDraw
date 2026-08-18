import type {
  BrushCompatibilityReport, BrushPreset
} from "../../contracts/brush";
import type { BinaryPlistValue } from "../archive/binaryPlist";
import {
  archiveGrain, archivePreview, archiveProperties, archiveRendering, archiveShape,
  archiveTaper, clamp, numeric
} from "./archiveControlMappings";
import { archiveResponseCurve } from "./archiveResponseCurve";

const supported = new Set([
  "plotSpacing", "plotSpacingJitter", "plotJitter", "plotJitterLongitudinal",
  "dynamicsFalloff", "plotSmoothing", "plotMovingAverageStabilization",
  "plotFFTSmoothingAmount", "plotFFTSmoothingBias", "taperPressure",
  "pencilTaperStartLength", "pencilTaperEndLength", "pencilTaperSize",
  "pencilTaperOpacity", "pencilTaperShape", "pencilTaperSizeLinked",
  "pencilTipAnimation", "taperStartLength", "taperEndLength", "taperSize",
  "taperOpacity", "taperShape", "taperSizeLinked", "shapeScatter", "shapeAngle",
  "shapeRoundness",
  "shapeInverted", "shapeAzimuth", "shapeOrientation", "shapeRotation",
  "shapeCount", "shapeCountJitter", "shapeRandomise", "shapeFlipXJitter",
  "shapeFlipYJitter", "shapeFilter", "shapeFilterMode", "grainDepth",
  "dynamicsPressureShapeRoundnessMinimum", "dynamicsTiltShapeRoundnessMinimum",
  "jitterShapeRoundness", "jitterShapeRoundnessX",
  "grainDepthMinimum", "grainDepthJitter", "textureScale", "textureZoom",
  "textureMovement", "textureRotation", "textureOffsetJitter", "textureFilter",
  "textureFilterMode", "textureInverted", "textureContrast", "textureBrightness",
  "dynamicsGlazedFlow", "textureApplication", "minOpacity",
  "previewRenderDisabled", "previewSize", "previewPressureMinimum",
  "previewPressureScale", "previewTiltAngleOffset", "dynamicsSmudgeAccumulation",
  "maxOpacity", "dynamicsPressureSize", "dynamicsPressureOpacity",
  "dynamicsPressureSizeCurve", "dynamicsPressureOpacityCurve",
  "dynamicsJitterOpacity", "dynamicsSpeedOpacity", "dynamicsTiltOpacity",
  "dynamicsTiltSize", "smudgeStrength", "smudgePickup", "smudgeFlow",
  "maxSize", "minSize", "paintSize", "paintOpacity",
  "bundledShapePath", "bundledGrainPath"
]);
const metadata = /^(?:\$class|name|version|author|creation|bundled|saved|preview|hover|erase|paint|color|signature)/i;
const excluded = /(?:wet|mix|bleed|hue|saturation|brightness|lightness|darkness|secondaryColor|metallic|roughness|height)/i;
function active(value: BinaryPlistValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Math.abs(value) > 0.000001;
  if (typeof value === "string") return value.length > 0;
  if (value instanceof Uint8Array || Array.isArray(value)) return value.length > 0;
  return value !== null && Object.keys(value).length > 0;
}

function bundledSource(root: Readonly<Record<string, BinaryPlistValue>>,
  key: "bundledShapePath" | "bundledGrainPath"): string | undefined {
  const value = root[key];
  return typeof value === "string" && value !== "$null" ? value : undefined;
}

function bundledHardness(name: string | undefined, fallback: number): number {
  if (!name) return fallback;
  if (/preset-hard/i.test(name)) return 1;
  if (/preset-soft|ultra-soft/i.test(name)) return 0;
  return fallback;
}

export interface ArchiveBrushResult {
  readonly preset: BrushPreset;
  readonly compatibility: BrushCompatibilityReport;
}

export function applyBrushArchiveSettings(
  preset: BrushPreset,
  root: Readonly<Record<string, BinaryPlistValue>>,
  _hasGrainAsset: boolean
): ArchiveBrushResult {
  const shapeSource = bundledSource(root, "bundledShapePath");
  const grainSource = bundledSource(root, "bundledGrainPath");
  const maximumSizeValue = numeric(root, "maxSize", -1);
  const maximumSize = maximumSizeValue > 0
    ? clamp(maximumSizeValue * 1_000, 1, 2_000) : preset.properties.maximumSize;
  const minimumSizeValue = numeric(root, "minSize", -1);
  const minimumSize = minimumSizeValue >= 0
    ? clamp(maximumSize * minimumSizeValue, 0.1, maximumSize)
    : preset.properties.minimumSize;
  const archiveName = root.name;
  const mapped: BrushPreset = { ...preset,
    savedSize: clamp(numeric(root, "paintSize", preset.savedSize ?? 0), 0, 1),
    savedOpacity: clamp(numeric(root, "paintOpacity", preset.savedOpacity ?? 1), 0, 1),
    strokePath: {
      spacing: clamp(numeric(root, "plotSpacing", preset.strokePath.spacing), 0.01, 4),
      spacingJitter: clamp(numeric(root, "plotSpacingJitter",
        preset.strokePath.spacingJitter), 0, 1),
      lateralJitter: clamp(numeric(root, "plotJitter", preset.strokePath.lateralJitter), 0, 4),
      linearJitter: clamp(numeric(root, "plotJitterLongitudinal",
        preset.strokePath.linearJitter), 0, 4),
      fallOff: clamp(numeric(root, "dynamicsFalloff", preset.strokePath.fallOff), 0, 1),
      scatter: 0
    },
    stabilization: {
      streamlineAmount: clamp(numeric(root, "plotSmoothing",
        preset.stabilization.streamlineAmount), 0, 1),
      streamlinePressure: preset.stabilization.streamlinePressure,
      stabilizationAmount: clamp(numeric(root, "plotMovingAverageStabilization",
        preset.stabilization.stabilizationAmount), 0, 1),
      motionFilteringAmount: clamp(numeric(root, "plotFFTSmoothingAmount",
        preset.stabilization.motionFilteringAmount), 0, 1),
      motionFilteringExpression: clamp(numeric(root, "plotFFTSmoothingBias",
        preset.stabilization.motionFilteringExpression), 0, 1)
    },
    taper: archiveTaper(root, preset.taper),
    shape: archiveShape(root, { ...preset.shape,
      hardness: bundledHardness(shapeSource, preset.shape.hardness),
    }, shapeSource),
    grain: archiveGrain(root, preset.grain, grainSource),
    rendering: archiveRendering(root, preset.rendering),
    dynamics: { sizeByPressure: clamp(numeric(root, "dynamicsPressureSize",
      preset.dynamics.sizeByPressure), 0, 1),
      opacityByPressure: clamp(numeric(root, "dynamicsPressureOpacity",
        preset.dynamics.opacityByPressure), 0, 1),
      tiltToSize: clamp(numeric(root, "dynamicsTiltSize", preset.dynamics.tiltToSize), -1, 1),
      pressureSizeCurve: archiveResponseCurve(root.dynamicsPressureSizeCurve,
        preset.dynamics.pressureSizeCurve),
      pressureOpacityCurve: archiveResponseCurve(root.dynamicsPressureOpacityCurve,
        preset.dynamics.pressureOpacityCurve),
      opacityJitter: clamp(numeric(root, "dynamicsJitterOpacity",
        preset.dynamics.opacityJitter ?? 0), 0, 1),
      speedOpacity: clamp(numeric(root, "dynamicsSpeedOpacity",
        preset.dynamics.speedOpacity ?? 0), -1, 1),
      tiltOpacity: clamp(numeric(root, "dynamicsTiltOpacity",
        preset.dynamics.tiltOpacity ?? 0), -1, 1) },
    smudge: { pull: clamp(numeric(root, "dynamicsSmudgeAccumulation",
      numeric(root, "smudgeStrength", preset.smudge.pull)), 0, 1),
      pickup: clamp(numeric(root, "smudgePickup", preset.smudge.pickup), 0, 1),
      flow: clamp(numeric(root, "smudgeFlow", preset.smudge.flow), 0, 1) },
    properties: archiveProperties(root, preset.properties, maximumSize, minimumSize),
    preview: archivePreview(root, preset.preview) };
  const keys = Object.keys(root);
  const compatibility: BrushCompatibilityReport = {
    archiveVersion: typeof root.version === "number" ? root.version : null,
    archiveName: typeof archiveName === "string" ? archiveName : null,
    supportedFields: keys.filter((key) => supported.has(key)).sort(),
    unsupportedActiveFields: keys.filter((key) => !supported.has(key) &&
      !metadata.test(key) && !excluded.test(key) && active(root[key] ?? null)).sort(),
    excludedSections: ["wet-mix", "color-dynamics", "materials"],
    shapeSourceState: "missing", grainSourceState: "missing", missingSourceNames: []
  };
  return { preset: mapped, compatibility };
}
