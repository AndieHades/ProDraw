import type {
  BrushPreset, BrushSourceKind, BrushSourceResource, CoverageMap, LoadedBrush
} from "../../contracts/brush";
import { sourceAsset, sourceCoverage } from "../../logic/brush/brushSourceAsset";

function fingerprint(kind: BrushSourceKind, map: CoverageMap): string {
  let hash = 2_166_136_261;
  for (const value of map.data) {
    hash ^= value; hash = Math.imul(hash, 16_777_619);
  }
  return `${kind}:${map.width}x${map.height}@${map.scaleReference ?? map.width}:` +
    (hash >>> 0).toString(16);
}

function append(
  resources: Map<string, BrushSourceResource>,
  kind: BrushSourceKind,
  map: CoverageMap | null,
  sourceBrushName: string
): void {
  if (!map) return;
  const id = fingerprint(kind, map);
  if (resources.has(id)) return;
  resources.set(id, { id, kind, sourceBrushName, map,
    asset: sourceAsset(map, sourceBrushName) });
}

export class BrushSourceCatalog {
  async collect(
    brushes: readonly BrushPreset[],
    load: (brush: BrushPreset) => Promise<LoadedBrush>
  ): Promise<readonly BrushSourceResource[]> {
    const resources = new Map<string, BrushSourceResource>();
    const results = await Promise.allSettled(brushes.map((brush) => load(brush)));
    for (const [index, result] of results.entries()) {
      if (result.status !== "fulfilled") continue;
      const brush = brushes[index]!;
      const loaded = result.value;
      append(resources, "shape", loaded.nativeShapeMap, brush.name);
      append(resources, "grain", loaded.nativeGrainMap, brush.name);
      for (const kind of ["shape", "grain"] as const) {
        const selected = brush.sources[kind];
        try {
          if (selected) append(resources, kind, sourceCoverage(selected), selected.sourceBrushName);
        } catch { /* One corrupt embedded source cannot block the library. */ }
      }
    }
    return [...resources.values()].sort((left, right) =>
      left.sourceBrushName.localeCompare(right.sourceBrushName));
  }
}
