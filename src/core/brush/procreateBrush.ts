import type {
  BrushCompatibilityReport, BrushPreset, CoverageMap, LoadedBrush
} from "../../contracts/brush";
import { unzip } from "../archive/unzip";
import { decodeKeyedArchiveRoot } from "../archive/keyedArchive";
import { applyBrushArchiveSettings } from "./brushArchiveSettings";
import { decodeCoverage } from "./decodeCoverage";

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
  warnings: string[]
): Promise<CoverageMap | null> {
  if (!bytes) return null;
  try { return await decodeCoverage(bytes, maximumSide); }
  catch { warnings.push(warning); return null; }
}

export async function decodeProcreateBrush(
  bytes: Uint8Array<ArrayBuffer>,
  preset: BrushPreset
): Promise<LoadedBrush> {
  const warnings: string[] = [];
  try {
    const entries = await unzip(bytes);
    const shapeBytes = entryByBaseName(entries, "shape.png");
    const grainBytes = entryByBaseName(entries, "grain.png");
    let resolvedPreset = preset;
    let compatibility = emptyBrushCompatibility();
    const archiveBytes = entryByBaseName(entries, "Brush.archive");
    if (archiveBytes) {
      try {
        const result = applyBrushArchiveSettings(preset,
          decodeKeyedArchiveRoot(archiveBytes), Boolean(grainBytes));
        resolvedPreset = preset.fileName.endsWith(".brush") ? result.preset : preset;
        compatibility = result.compatibility;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown settings failure";
        warnings.push(`archive-settings-fallback:${detail}`);
      }
    } else warnings.push("archive-settings-missing");
    const shapeMap = await coverage(shapeBytes, 512, "shape-decode-fallback", warnings);
    const grainMap = await coverage(grainBytes, 256, "grain-decode-fallback", warnings);
    if (!shapeMap) warnings.push("built-in-shape-fallback");
    if (!grainMap && resolvedPreset.grain.strength > 0) {
      warnings.push("procedural-grain-fallback");
    }
    return { ...resolvedPreset, shapeMap, grainMap, compatibility, warnings };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown decode failure";
    return { ...preset, shapeMap: null, grainMap: null,
      compatibility: emptyBrushCompatibility(), warnings: [`archive-fallback:${detail}`] };
  }
}

export async function fetchProcreateBrush(preset: BrushPreset): Promise<LoadedBrush> {
  const response = await fetch(preset.sourceUrl);
  if (!response.ok) throw new Error(`Brush asset request failed: ${response.status}`);
  return decodeProcreateBrush(new Uint8Array(await response.arrayBuffer()), preset);
}
