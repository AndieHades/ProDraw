import type {
  BrushCompatibilityReport, BrushPreset
} from "../../contracts/brush";
import type { BinaryPlistValue } from "../archive/binaryPlist";

const supported = new Set([
  "plotSpacing", "plotSpacingJitter", "plotJitter", "plotJitterLongitudinal",
  "dynamicsFalloff", "plotSmoothing", "plotMovingAverageStabilization",
  "plotFFTSmoothingAmount", "plotFFTSmoothingBias", "taperStartLength",
  "taperEndLength", "taperPressure", "shapeScatter", "shapeAngle",
  "shapeRoundness", "shapeInverted", "grainDepth", "textureScale",
  "textureInverted", "textureContrast", "textureBrightness", "dynamicsGlazedFlow",
  "maxOpacity", "dynamicsPressureSize", "dynamicsPressureOpacity",
  "dynamicsTiltSize", "smudgeStrength", "smudgePickup", "smudgeFlow",
  "maxSize", "minSize", "bundledShapePath", "bundledGrainPath"
]);
const metadata = /^(?:\$class|name|version|author|creation|bundled|saved|preview|hover|erase|paint|color|signature)/i;
const excluded = /(?:wet|mix|bleed|hue|saturation|brightness|lightness|darkness|secondaryColor|metallic|roughness|height)/i;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

function numeric(root: Readonly<Record<string, BinaryPlistValue>>, key: string,
  fallback: number): number {
  const value = root[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function active(value: BinaryPlistValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Math.abs(value) > 0.000001;
  if (typeof value === "string") return value.length > 0;
  if (value instanceof Uint8Array || Array.isArray(value)) return value.length > 0;
  return value !== null && Object.keys(value).length > 0;
}

function angle(value: number): number {
  const turn = Math.PI * 2;
  return ((value + Math.PI) % turn + turn) % turn - Math.PI;
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
    strokePath: {
      spacing: clamp(numeric(root, "plotSpacing", preset.strokePath.spacing), 0.01, 4),
      spacingJitter: clamp(numeric(root, "plotSpacingJitter",
        preset.strokePath.spacingJitter), 0, 1),
      lateralJitter: clamp(numeric(root, "plotJitter", preset.strokePath.lateralJitter), 0, 4),
      linearJitter: clamp(numeric(root, "plotJitterLongitudinal",
        preset.strokePath.linearJitter), 0, 4),
      fallOff: clamp(numeric(root, "dynamicsFalloff", preset.strokePath.fallOff), 0, 1),
      scatter: clamp(numeric(root, "shapeScatter", preset.strokePath.scatter), 0, 4)
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
    taper: { start: clamp(numeric(root, "taperStartLength", preset.taper.start), 0, 1),
      end: clamp(numeric(root, "taperEndLength", preset.taper.end), 0, 1),
      pressure: clamp(numeric(root, "taperPressure", preset.taper.pressure), 0, 1) },
    shape: { ...preset.shape,
      hardness: bundledHardness(shapeSource, preset.shape.hardness),
      angle: angle(numeric(root, "shapeAngle", preset.shape.angle)),
      roundness: clamp(numeric(root, "shapeRoundness", preset.shape.roundness), 0.05, 1),
      ...(shapeSource ? { sourceName: shapeSource } : {}) },
    grain: { strength: clamp(numeric(root, "grainDepth", preset.grain.strength), 0, 1),
      scale: clamp(numeric(root, "textureScale", preset.grain.scale), 0.05, 10),
      ...(grainSource ? { sourceName: grainSource } : {}) },
    rendering: { flow: clamp(numeric(root, "dynamicsGlazedFlow",
      preset.rendering.flow), 0.01, 1),
      opacity: clamp(numeric(root, "maxOpacity", preset.rendering.opacity), 0.01, 1) },
    dynamics: { sizeByPressure: clamp(numeric(root, "dynamicsPressureSize",
      preset.dynamics.sizeByPressure), 0, 1),
      opacityByPressure: clamp(numeric(root, "dynamicsPressureOpacity",
        preset.dynamics.opacityByPressure), 0, 1),
      tiltToSize: clamp(numeric(root, "dynamicsTiltSize", preset.dynamics.tiltToSize), -1, 1) },
    smudge: { pull: clamp(numeric(root, "smudgeStrength", preset.smudge.pull), 0, 1),
      pickup: clamp(numeric(root, "smudgePickup", preset.smudge.pickup), 0, 1),
      flow: clamp(numeric(root, "smudgeFlow", preset.smudge.flow), 0, 1) },
    properties: { maximumSize, minimumSize } };
  const keys = Object.keys(root);
  const compatibility: BrushCompatibilityReport = {
    archiveVersion: typeof root.version === "number" ? root.version : null,
    archiveName: typeof archiveName === "string" ? archiveName : null,
    supportedFields: keys.filter((key) => supported.has(key)).sort(),
    unsupportedActiveFields: keys.filter((key) => !supported.has(key) &&
      !metadata.test(key) && !excluded.test(key) && active(root[key] ?? null)).sort(),
    excludedSections: ["wet-mix", "color-dynamics", "materials"]
  };
  return { preset: mapped, compatibility };
}
