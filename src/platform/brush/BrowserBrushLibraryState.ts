import type { BrushLibraryStatePort } from "../../contracts/brushStorage";

const key = "prodraw.brush-library-state";

export class BrowserBrushLibraryState implements BrushLibraryStatePort {
  readonly #storage: Storage | null;
  constructor(storage: Storage | null = safeStorage()) { this.#storage = storage; }
  async readState(): Promise<string | null> {
    try { return this.#storage?.getItem(key) ?? null; } catch { return null; }
  }
  async writeState(json: string): Promise<void> {
    try { this.#storage?.setItem(key, json); } catch { /* optional preference */ }
  }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; }
  catch { return null; }
}
