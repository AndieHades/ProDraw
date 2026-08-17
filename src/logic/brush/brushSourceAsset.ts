import type {
  BrushPreset, BrushSourceAsset, BrushSourceKind, CoverageMap, LoadedBrush
} from "../../contracts/brush";

const chunkSize = 24_576;

function encodeBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let output = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize));
    output += btoa(String.fromCharCode(...chunk));
  }
  return output;
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function sourceAsset(map: CoverageMap, sourceBrushName: string): BrushSourceAsset {
  return { sourceBrushName, width: map.width, height: map.height,
    alphaBase64: encodeBase64(map.data), ...(map.scaleReference
      ? { scaleReference: map.scaleReference } : {}) };
}

export function sourceCoverage(asset: BrushSourceAsset): CoverageMap {
  if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) ||
      asset.width < 1 || asset.height < 1 || asset.width * asset.height > 1_048_576) {
    throw new Error("Invalid brush source dimensions");
  }
  const data = decodeBase64(asset.alphaBase64);
  if (data.length !== asset.width * asset.height) throw new Error("Invalid brush source data");
  return { width: asset.width, height: asset.height, data,
    ...(asset.scaleReference ? { scaleReference: asset.scaleReference } : {}) };
}

export function effectiveBrushSources(
  preset: BrushPreset,
  loaded: LoadedBrush
): Pick<LoadedBrush, "shapeMap" | "grainMap"> {
  const selected = preset.sources;
  return { shapeMap: selected.shape ? sourceCoverage(selected.shape) : loaded.nativeShapeMap,
    grainMap: selected.grain ? sourceCoverage(selected.grain) : loaded.nativeGrainMap };
}

export function selectBrushSource(
  preset: BrushPreset,
  kind: BrushSourceKind,
  asset: BrushSourceAsset
): BrushPreset {
  return { ...preset, sources: { ...preset.sources, [kind]: asset } };
}
