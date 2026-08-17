import type { BrushPreset, BrushSourceAsset } from "../../contracts/brush";
import type { BrushPresetFileV1 } from "../../contracts/brushLibrary";
import { clamp, parsePresetSettings } from "./presetSettingsParser";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
function sourceAsset(value: unknown): BrushSourceAsset | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<BrushSourceAsset>;
  const pixels = Number(source.width) * Number(source.height);
  if (typeof source.sourceBrushName !== "string" || !source.sourceBrushName.trim() ||
      source.sourceBrushName.length > 200 || !Number.isInteger(source.width) ||
      !Number.isInteger(source.height) || pixels < 1 || pixels > 1_048_576 ||
      typeof source.alphaBase64 !== "string" || source.alphaBase64.length > 1_500_000) return null;
  return { sourceBrushName: source.sourceBrushName, width: source.width!,
    height: source.height!, alphaBase64: source.alphaBase64,
    ...(Number.isFinite(source.scaleReference) && Number(source.scaleReference) > 0
      ? { scaleReference: Math.min(8192, Math.round(Number(source.scaleReference))) } : {}) };
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
  const sources = parsed.sources;
  return { ...base, format: "prodraw-brush", version: 1,
    revision: Math.max(1, Math.round(clamp(parsed.revision, 1, 1_000_000, 1))),
    id: parsed.id, name: parsed.name.trim() || base.name, setName, fileName,
    baseFileName: typeof parsed.baseFileName === "string"
      ? parsed.baseFileName : base.baseFileName,
    replacesFileName: typeof parsed.replacesFileName === "string"
      ? parsed.replacesFileName : null, ...parsePresetSettings(parsed, base),
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
