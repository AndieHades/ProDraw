import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { BrushPreviewCache } from "../../src/core/brush/BrushPreviewCache";

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("brush preview cache", () => {
  it("round trips an 80px preview across cache instances", () => {
    const storage = new MemoryStorage(), brush = BUNDLED_BRUSHES[0]!;
    const pixels = Uint8ClampedArray.from({ length: 80 * 80 * 4 },
      (_, index) => index % 251);
    new BrushPreviewCache(storage).write(brush, pixels);
    expect(new BrushPreviewCache(storage).read(brush)).toEqual(pixels);
  });

  it("invalidates by revision and drops corrupt stored pixels", () => {
    const storage = new MemoryStorage(), brush = BUNDLED_BRUSHES[0]!;
    const cache = new BrushPreviewCache(storage);
    cache.write(brush, new Uint8ClampedArray(80 * 80 * 4));
    expect(cache.read({ ...brush, revision: brush.revision + 1 })).toBeNull();
    cache.write({ ...brush, revision: brush.revision + 1 },
      new Uint8ClampedArray(80 * 80 * 4));
    expect(cache.read(brush)).toBeNull();
    cache.write(brush, new Uint8ClampedArray(80 * 80 * 4));
    storage.values.set([...storage.values.keys()][0]!, "broken");
    expect(new BrushPreviewCache(storage).read(brush)).toBeNull();
  });
});
