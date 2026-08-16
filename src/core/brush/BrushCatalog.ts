import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { emptyBrushCompatibility, fetchProcreateBrush } from "./procreateBrush";

export class BrushCatalog {
  readonly #loaded = new Map<string, Promise<LoadedBrush>>();

  load(preset: BrushPreset): Promise<LoadedBrush> {
    const key = `${preset.id}:${preset.revision}`;
    const cached = this.#loaded.get(key);
    if (cached) return cached;
    const loading = fetchProcreateBrush(preset).catch((error: unknown) => {
      this.#loaded.delete(key);
      const detail = error instanceof Error ? error.message : "unknown fetch failure";
      return { ...preset, shapeMap: null, grainMap: null,
        compatibility: emptyBrushCompatibility(), warnings: [`asset-fallback:${detail}`] };
    });
    this.#loaded.set(key, loading);
    return loading;
  }

  clear(id: string): void {
    for (const key of this.#loaded.keys()) {
      if (key.startsWith(`${id}:`)) this.#loaded.delete(key);
    }
  }
}
