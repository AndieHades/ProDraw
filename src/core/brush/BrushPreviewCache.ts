import type { BrushPreset } from "../../contracts/brush";

const rendererVersion = "shape-v7";
const prefix = "prodraw.brush-preview.";
const expectedBytes = 80 * 80 * 4;
const maximumEntries = 64;
const browserStorage = (): Storage | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; }
  catch { return null; }
};

const keyOf = (brush: BrushPreset): string =>
  `${rendererVersion}:${brush.id}@${brush.revision}`;

function encode(bytes: Uint8ClampedArray): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary);
}

function decode(value: string): Uint8ClampedArray | null {
  try {
    const binary = atob(value);
    if (binary.length !== expectedBytes) return null;
    return Uint8ClampedArray.from(binary, (character) => character.charCodeAt(0));
  } catch { return null; }
}

export class BrushPreviewCache {
  readonly #storage: Storage | null;
  readonly #memory = new Map<string, Uint8ClampedArray>();

  constructor(storage: Storage | null = browserStorage()) { this.#storage = storage; }

  read(brush: BrushPreset): Uint8ClampedArray | null {
    const key = keyOf(brush), memory = this.#memory.get(key);
    if (memory) return memory.slice();
    try {
      const stored = this.#storage?.getItem(prefix + key);
      if (!stored) return null;
      const pixels = decode(stored);
      if (!pixels) { this.#storage?.removeItem(prefix + key); return null; }
      this.#memory.set(key, pixels); return pixels.slice();
    } catch { return null; }
  }

  write(brush: BrushPreset, pixels: Uint8ClampedArray): void {
    if (pixels.length !== expectedBytes) return;
    const key = keyOf(brush), identity = `${rendererVersion}:${brush.id}@`;
    for (const candidate of this.#memory.keys()) {
      if (candidate.startsWith(identity)) this.#memory.delete(candidate);
    }
    const copy = pixels.slice(); this.#memory.set(key, copy);
    try {
      this.pruneStorage(identity, prefix + key);
      this.#storage?.setItem(prefix + key, encode(copy));
    } catch { /* optional cache */ }
  }

  private pruneStorage(identity: string, current: string): void {
    if (!this.#storage) return;
    const keys = Array.from({ length: this.#storage.length }, (_, index) =>
      this.#storage?.key(index)).filter((key): key is string =>
      !!key && key.startsWith(prefix));
    for (const key of keys) {
      if (key !== current && key.startsWith(prefix + identity)) this.#storage.removeItem(key);
    }
    const survivors = keys.filter((key) => key !== current &&
      !key.startsWith(prefix + identity));
    while (survivors.length >= maximumEntries) this.#storage.removeItem(survivors.shift()!);
  }
}
