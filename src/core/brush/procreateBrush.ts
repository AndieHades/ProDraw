import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { unzip } from "../archive/unzip";
import { decodeCoverage } from "./decodeCoverage";

function entryByBaseName(
  entries: ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
  wanted: string
): Uint8Array<ArrayBuffer> | undefined {
  const lowerWanted = wanted.toLowerCase();
  for (const [name, bytes] of entries) {
    if (name.replace(/\\/g, "/").split("/").at(-1)?.toLowerCase() === lowerWanted) {
      return bytes;
    }
  }
  return undefined;
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
    const shapeMap = shapeBytes ? await decodeCoverage(shapeBytes) : null;
    const grainMap = grainBytes ? await decodeCoverage(grainBytes, 256) : null;
    if (!shapeMap) warnings.push("built-in-shape-fallback");
    if (!grainMap && preset.grain.strength > 0) warnings.push("procedural-grain-fallback");
    return { ...preset, shapeMap, grainMap, warnings };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown decode failure";
    return { ...preset, shapeMap: null, grainMap: null,
      warnings: [`archive-fallback:${detail}`] };
  }
}

export async function fetchProcreateBrush(preset: BrushPreset): Promise<LoadedBrush> {
  const response = await fetch(preset.sourceUrl);
  if (!response.ok) throw new Error(`Brush asset request failed: ${response.status}`);
  return decodeProcreateBrush(new Uint8Array(await response.arrayBuffer()), preset);
}
