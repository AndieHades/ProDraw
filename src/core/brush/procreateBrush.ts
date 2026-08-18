import type {
  BrushCompatibilityReport, BrushPreset, CoverageMap, LoadedBrush
} from "../../contracts/brush";
import type { BrushSourceResolver } from "../../contracts/brushSourceResolver";
import { unzipEntries } from "../archive/unzip";
import { decodeKeyedArchiveRoot } from "../archive/keyedArchive";
import { applyBrushArchiveSettings } from "./brushArchiveSettings";
import { decodeCoverage, type CoverageDecodeOptions } from "./decodeCoverage";
import { sourceCoverage } from "../../logic/brush/brushSourceAsset";
import { brushSourceFolder } from "./brushSourceFolder";
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
  excludedSections: ["wet-mix", "color-dynamics", "materials"],
  shapeSourceState: "missing", grainSourceState: "missing", missingSourceNames: []
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
  preset: BrushPreset,
  sourceResolver: BrushSourceResolver = brushSourceFolder
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
        grainOptions = { inverted: root.textureInverted === true };
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown settings failure";
        warnings.push(`archive-settings-fallback:${detail}`);
      }
    } else warnings.push("archive-settings-missing");
    const embeddedShapeMap = await coverage(shapeBytes, rasterConfig.sourceMaximumSide,
      "shape-decode-fallback", warnings, shapeOptions);
    const embeddedGrainMap = await coverage(grainBytes, rasterConfig.grainDecodeMaximumSide,
      "grain-decode-fallback", warnings, grainOptions);
    const libraryShapeMap = await sourceResolver.resolve({ brushId: resolvedPreset.id,
      kind: "shape", maximumSide: rasterConfig.sourceMaximumSide,
      inverted: shapeOptions.inverted === true });
    const libraryGrainMap = await sourceResolver.resolve({ brushId: resolvedPreset.id,
      kind: "grain", maximumSide: rasterConfig.grainDecodeMaximumSide,
      inverted: grainOptions.inverted === true });
    const nativeShapeMap = libraryShapeMap ?? embeddedShapeMap;
    const nativeGrainMap = libraryGrainMap ?? embeddedGrainMap;
    if (!nativeShapeMap) warnings.push("unresolved-shape-source");
    if (!nativeGrainMap && resolvedPreset.grain.strength > 0) {
      warnings.push("unresolved-grain-source");
    }
    let shapeMap = nativeShapeMap;
    let grainMap = nativeGrainMap;
    try {
      if (resolvedPreset.sources.shape) shapeMap = sourceCoverage(resolvedPreset.sources.shape);
      if (resolvedPreset.sources.grain) grainMap = sourceCoverage(resolvedPreset.sources.grain);
    } catch { warnings.push("embedded-source-fallback"); }
    const shapeSourceState = resolvedPreset.sources.shape || libraryShapeMap
      ? "resolved" as const : embeddedShapeMap ? "embedded" as const : "missing" as const;
    const grainSourceState = resolvedPreset.sources.grain || libraryGrainMap
      ? "resolved" as const : embeddedGrainMap ? "embedded" as const : "missing" as const;
    const missingSourceNames = [shapeSourceState === "missing"
      ? resolvedPreset.shape.sourceName : null, grainSourceState === "missing" &&
      resolvedPreset.grain.strength > 0 ? resolvedPreset.grain.sourceName : null]
      .filter((name): name is string => Boolean(name));
    compatibility = { ...compatibility, shapeSourceState, grainSourceState,
      missingSourceNames };
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
