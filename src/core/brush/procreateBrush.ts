import type {
  BrushCompatibilityReport, BrushPreset, CoverageMap, LoadedBrush
} from "../../contracts/brush";
import { unzipEntries } from "../archive/unzip";
import { decodeKeyedArchiveRoot } from "../archive/keyedArchive";
import { applyBrushArchiveSettings } from "./brushArchiveSettings";
import { decodeCoverage, type CoverageDecodeOptions } from "./decodeCoverage";
import { sourceCoverage } from "../../logic/brush/brushSourceAsset";
import rasterConfig from "../../config/brush-raster.json" with { type: "json" };

function entryByBaseName(
  entries: ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
  wanted: string
): Uint8Array<ArrayBuffer> | undefined {
  const lowerWanted = wanted.toLowerCase();
  for (const [name, bytes] of entries) {
    if (name.replace(/\\/g, "/").toLowerCase() === lowerWanted) return bytes;
  }
  for (const [name, bytes] of entries) {
    if (name.replace(/\\/g, "/").split("/").at(-1)?.toLowerCase() === lowerWanted) {
      return bytes;
    }
  }
  return undefined;
}

export const emptyBrushCompatibility = (): BrushCompatibilityReport => ({
  archiveVersion: null, archiveName: null, supportedFields: [],
  unsupportedActiveFields: [],
  excludedSections: ["wet-mix", "color-dynamics", "materials"]
});

async function coverage(
  bytes: Uint8Array<ArrayBuffer> | undefined,
  maximumSide: number,
  warning: string,
  warnings: string[],
  options: CoverageDecodeOptions = {}
): Promise<CoverageMap | null> {
  if (!bytes) return null;
  try { return await decodeCoverage(bytes, maximumSide, options); }
  catch { warnings.push(warning); return null; }
}

export async function decodeProcreateBrush(
  bytes: Uint8Array<ArrayBuffer>,
  preset: BrushPreset
): Promise<LoadedBrush> {
  const warnings: string[] = [];
  try {
    const entries = await unzipEntries(bytes, ["Brush.archive", "Shape.png", "Grain.png"]);
    const shapeBytes = entryByBaseName(entries, "shape.png");
    const grainBytes = entryByBaseName(entries, "grain.png");
    let resolvedPreset = preset;
    let compatibility = emptyBrushCompatibility();
    let shapeOptions: CoverageDecodeOptions = {};
    let grainOptions: CoverageDecodeOptions = {};
    const archiveBytes = entryByBaseName(entries, "Brush.archive");
    if (archiveBytes) {
      try {
        const root = decodeKeyedArchiveRoot(archiveBytes);
        const result = applyBrushArchiveSettings(preset, root, Boolean(grainBytes));
        resolvedPreset = preset.fileName.endsWith(".brush") ? result.preset : preset;
        compatibility = result.compatibility;
        shapeOptions = { inverted: root.shapeInverted === true };
        grainOptions = { inverted: root.textureInverted === true,
          contrast: typeof root.textureContrast === "number" ? root.textureContrast : 0,
          brightness: typeof root.textureBrightness === "number" ? root.textureBrightness : 0 };
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown settings failure";
        warnings.push(`archive-settings-fallback:${detail}`);
      }
    } else warnings.push("archive-settings-missing");
    const nativeShapeMap = await coverage(shapeBytes, rasterConfig.sourceMaximumSide,
      "shape-decode-fallback", warnings, shapeOptions);
    const nativeGrainMap = await coverage(grainBytes, rasterConfig.grainDecodeMaximumSide,
      "grain-decode-fallback", warnings, grainOptions);
    if (!nativeShapeMap) warnings.push("built-in-shape-fallback");
    if (!nativeGrainMap && resolvedPreset.grain.strength > 0) {
      warnings.push("procedural-grain-fallback");
    }
    let shapeMap = nativeShapeMap;
    let grainMap = nativeGrainMap;
    try {
      if (resolvedPreset.sources.shape) shapeMap = sourceCoverage(resolvedPreset.sources.shape);
      if (resolvedPreset.sources.grain) grainMap = sourceCoverage(resolvedPreset.sources.grain);
    } catch { warnings.push("embedded-source-fallback"); }
    return { ...resolvedPreset, shapeMap, grainMap, nativeShapeMap, nativeGrainMap,
      compatibility, warnings };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown decode failure";
    return { ...preset, shapeMap: null, grainMap: null,
      nativeShapeMap: null, nativeGrainMap: null,
      compatibility: emptyBrushCompatibility(), warnings: [`archive-fallback:${detail}`] };
  }
}

export async function fetchProcreateBrush(preset: BrushPreset): Promise<LoadedBrush> {
  const response = await fetch(preset.sourceUrl);
  if (!response.ok) throw new Error(`Brush asset request failed: ${response.status}`);
  return decodeProcreateBrush(new Uint8Array(await response.arrayBuffer()), preset);
}
