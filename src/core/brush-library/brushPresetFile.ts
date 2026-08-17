import type { BrushPreset, BrushSourceAsset } from "../../contracts/brush";
import type { BrushPresetFileV1 } from "../../contracts/brushLibrary";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const barrelActions = new Set(["none", "eraser", "smudge"]);
const eraserActions = new Set(["eraser", "smudge"]);

function clamp(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
}

function pressureCurve(value: unknown, fallback: readonly [number, number, number, number]) {
  if (!Array.isArray(value) || value.length !== 4) return fallback;
  return value.map((point, index) => clamp(point, 0, 1, fallback[index]!)) as
    unknown as [number, number, number, number];
}

function action<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T {
  return typeof value === "string" && allowed.has(value) ? value as T : fallback;
}

function sourceAsset(value: unknown): BrushSourceAsset | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<BrushSourceAsset>;
  const pixels = Number(source.width) * Number(source.height);
  if (typeof source.sourceBrushName !== "string" || !source.sourceBrushName.trim() ||
      source.sourceBrushName.length > 200 || !Number.isInteger(source.width) ||
      !Number.isInteger(source.height) || pixels < 1 || pixels > 1_048_576 ||
      typeof source.alphaBase64 !== "string" || source.alphaBase64.length > 1_500_000) return null;
  return { sourceBrushName: source.sourceBrushName, width: source.width!,
    height: source.height!, alphaBase64: source.alphaBase64 };
}

export function presetFileBytes(preset: BrushPreset): Uint8Array<ArrayBuffer> {
  const environmentKeys = new Set(["setName", "fileName", "sourceUrl"]);
  return encoder.encode(JSON.stringify(preset, (key, value) =>
    environmentKeys.has(key) ? undefined : value, 2));
}

export function parsePresetFile(
  bytes: Uint8Array<ArrayBuffer>,
  setName: string,
  fileName: string,
  base: BrushPreset
): BrushPreset {
  const parsed = JSON.parse(decoder.decode(bytes)) as Partial<BrushPresetFileV1>;
  if (parsed.format !== "prodraw-brush" || parsed.version !== 1 ||
      typeof parsed.id !== "string" || typeof parsed.name !== "string") {
    throw new Error("Unsupported ProDraw brush preset");
  }
  const path = parsed.strokePath;
  const stabilization = parsed.stabilization;
  const taper = parsed.taper;
  const shape = parsed.shape;
  const grain = parsed.grain;
  const rendering = parsed.rendering;
  const dynamics = parsed.dynamics;
  const smudge = parsed.smudge;
  const stylus = parsed.stylus;
  const properties = parsed.properties;
  const sources = parsed.sources;
  return { ...base, format: "prodraw-brush", version: 1,
    revision: Math.max(1, Math.round(clamp(parsed.revision, 1, 1_000_000, 1))),
    id: parsed.id, name: parsed.name.trim() || base.name, setName, fileName,
    baseFileName: typeof parsed.baseFileName === "string"
      ? parsed.baseFileName : base.baseFileName,
    replacesFileName: typeof parsed.replacesFileName === "string"
      ? parsed.replacesFileName : null,
    strokePath: { spacing: clamp(path?.spacing, 0.01, 4, base.strokePath.spacing),
      spacingJitter: clamp(path?.spacingJitter, 0, 1, 0),
      lateralJitter: clamp(path?.lateralJitter, 0, 4, 0),
      linearJitter: clamp(path?.linearJitter, 0, 4, 0),
      fallOff: clamp(path?.fallOff, 0, 1, 0),
      scatter: clamp(path?.scatter, 0, 4, base.strokePath.scatter) },
    stabilization: { streamlineAmount: clamp(stabilization?.streamlineAmount, 0, 1, 0),
      streamlinePressure: clamp(stabilization?.streamlinePressure, 0, 1, 0),
      stabilizationAmount: clamp(stabilization?.stabilizationAmount, 0, 1, 0),
      motionFilteringAmount: clamp(stabilization?.motionFilteringAmount, 0, 1, 0),
      motionFilteringExpression: clamp(stabilization?.motionFilteringExpression, 0, 1, 0) },
    taper: { start: clamp(taper?.start, 0, 1, 0),
      end: clamp(taper?.end, 0, 1, 0), pressure: clamp(taper?.pressure, 0, 1, 0) },
    shape: { hardness: clamp(shape?.hardness, 0, 1, base.shape.hardness),
      angle: clamp(shape?.angle, -Math.PI, Math.PI, 0),
      roundness: clamp(shape?.roundness, 0.05, 1, 1) },
    grain: { strength: clamp(grain?.strength, 0, 1, base.grain.strength),
      scale: clamp(grain?.scale, 0.05, 10, 1) },
    rendering: { flow: clamp(rendering?.flow, 0.01, 1, base.rendering.flow),
      opacity: clamp(rendering?.opacity, 0.01, 1, 1) },
    dynamics: { sizeByPressure: clamp(dynamics?.sizeByPressure, 0, 1, 0.82),
      opacityByPressure: clamp(dynamics?.opacityByPressure, 0, 1, 0.28),
      tiltToSize: clamp(dynamics?.tiltToSize, -1, 1, 0) },
    smudge: { flow: clamp(smudge?.flow, 0, 1, base.smudge.flow),
      pickup: clamp(smudge?.pickup, 0, 1, base.smudge.pickup),
      pull: clamp(smudge?.pull, 0, 1, base.smudge.pull) },
    stylus: { minimumPressure: clamp(stylus?.minimumPressure, 0, 0.5, 0.01),
      pressureCurve: pressureCurve(stylus?.pressureCurve, base.stylus.pressureCurve),
      tiltEnabled: stylus?.tiltEnabled !== false,
      barrelAction: action(stylus?.barrelAction, barrelActions, "eraser"),
      eraserAction: action(stylus?.eraserAction, eraserActions, "eraser") },
    properties: { maximumSize: clamp(properties?.maximumSize, 1, 2000, 500),
      minimumSize: clamp(properties?.minimumSize, 0.1, 500, 1) },
    sources: { shape: sourceAsset(sources?.shape), grain: sourceAsset(sources?.grain) } };
}

export function presetBaseFileName(bytes: Uint8Array<ArrayBuffer>): string | null {
  try {
    const parsed = JSON.parse(decoder.decode(bytes)) as { baseFileName?: unknown };
    return typeof parsed.baseFileName === "string" ? parsed.baseFileName : null;
  } catch {
    return null;
  }
}
