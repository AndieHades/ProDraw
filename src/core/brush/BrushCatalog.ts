import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { BrushLibraryStoragePort } from "../../contracts/brushStorage";
import {
  decodeProcreateBrush, emptyBrushCompatibility, fetchProcreateBrush
} from "./procreateBrush";

export class BrushCatalog {
  readonly #loaded = new Map<string, Promise<LoadedBrush>>();
  readonly #lastWorking = new Map<string, LoadedBrush>();
  readonly #storage: BrushLibraryStoragePort | null;

  constructor(storage: BrushLibraryStoragePort | null = null) { this.#storage = storage; }

  load(preset: BrushPreset): Promise<LoadedBrush> {
    const key = `${preset.id}:${preset.revision}`;
    const cached = this.#loaded.get(key);
    if (cached) return cached;
    const loading = this.loadArchive(preset).then((loaded) => {
      this.#lastWorking.set(preset.id, loaded); return loaded;
    }).catch((error: unknown) => {
      this.#loaded.delete(key);
      const working = this.#lastWorking.get(preset.id);
      if (working) return { ...working, ...preset, shapeMap: working.shapeMap,
        grainMap: working.grainMap, compatibility: working.compatibility,
        warnings: [...working.warnings, "last-working-fallback"] };
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

  private async loadArchive(preset: BrushPreset): Promise<LoadedBrush> {
    if (this.#storage) {
      try {
        const bytes = await this.#storage.readFile(preset.setName, preset.baseFileName);
        const loaded = await decodeProcreateBrush(bytes, preset);
        if (!loaded.warnings.some((warning) => warning.startsWith("archive-fallback"))) {
          return loaded;
        }
      } catch { /* Bundled URL or last-working state remains available. */ }
    }
    if (preset.sourceUrl) return fetchProcreateBrush(preset);
    throw new Error("Brush archive is unavailable");
  }
}
