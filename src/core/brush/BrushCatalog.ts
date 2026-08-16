import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { fetchProcreateBrush } from "./procreateBrush";

export class BrushCatalog {
  readonly presets: readonly BrushPreset[];
  readonly #loaded = new Map<string, Promise<LoadedBrush>>();

  constructor(presets: readonly BrushPreset[]) {
    if (!presets.length) throw new Error("Brush catalog cannot be empty");
    this.presets = presets;
  }

  preset(id: string): BrushPreset {
    const preset = this.presets.find((candidate) => candidate.id === id);
    if (!preset) throw new Error(`Unknown brush: ${id}`);
    return preset;
  }

  load(id: string): Promise<LoadedBrush> {
    const cached = this.#loaded.get(id);
    if (cached) return cached;
    const loading = fetchProcreateBrush(this.preset(id));
    this.#loaded.set(id, loading);
    return loading;
  }

  clear(id: string): void {
    this.#loaded.delete(id);
  }
}
