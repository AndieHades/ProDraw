import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { BrushDecoderPort } from "../../contracts/brushDecoder";
import type { BrushLibraryStoragePort } from "../../contracts/brushStorage";
import {
  decodeProcreateBrush, emptyBrushCompatibility
} from "./procreateBrush";

export class BrushCatalog {
  readonly #loaded = new Map<string, Promise<LoadedBrush>>();
  readonly #archives = new Map<string, Promise<Uint8Array<ArrayBuffer>>>();
  readonly #lastWorking = new Map<string, LoadedBrush>();
  readonly #storage: BrushLibraryStoragePort | null;
  readonly #decoder: BrushDecoderPort;

  constructor(
    storage: BrushLibraryStoragePort | null = null,
    decoder: BrushDecoderPort = { decode: decodeProcreateBrush }
  ) {
    this.#storage = storage;
    this.#decoder = decoder;
  }

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
        grainMap: working.grainMap, nativeShapeMap: working.nativeShapeMap,
        nativeGrainMap: working.nativeGrainMap, compatibility: working.compatibility,
        warnings: [...working.warnings, "last-working-fallback"] };
      const detail = error instanceof Error ? error.message : "unknown fetch failure";
      return { ...preset, shapeMap: null, grainMap: null,
        nativeShapeMap: null, nativeGrainMap: null,
        compatibility: emptyBrushCompatibility(), warnings: [`asset-fallback:${detail}`] };
    });
    this.#loaded.set(key, loading);
    return loading;
  }

  clear(id: string): void {
    for (const key of this.#loaded.keys()) {
      if (key.startsWith(`${id}:`)) this.#loaded.delete(key);
    }
    for (const key of this.#archives.keys()) {
      if (key.startsWith(`${id}:`)) this.#archives.delete(key);
    }
  }

  private async loadArchive(preset: BrushPreset): Promise<LoadedBrush> {
    const loaded = await this.#decoder.decode(await this.archive(preset), preset);
    if (!loaded.warnings.some((warning) => warning.startsWith("archive-fallback"))) {
      return loaded;
    }
    if (!preset.sourceUrl) throw new Error("Brush archive is unavailable");
    return this.#decoder.decode(await this.fetchBytes(preset.sourceUrl), preset);
  }

  private archive(preset: BrushPreset): Promise<Uint8Array<ArrayBuffer>> {
    const key = `${preset.id}:${preset.revision}`;
    const cached = this.#archives.get(key); if (cached) return cached;
    const loading = (async () => {
      if (this.#storage) {
        try { return await this.#storage.readFile(preset.setName, preset.baseFileName); }
        catch { /* Bundled URL remains available. */ }
      }
      if (preset.sourceUrl) return this.fetchBytes(preset.sourceUrl);
      throw new Error("Brush archive is unavailable");
    })().catch((error: unknown) => { this.#archives.delete(key); throw error; });
    this.#archives.set(key, loading); return loading;
  }

  private async fetchBytes(sourceUrl: string): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Brush asset request failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
