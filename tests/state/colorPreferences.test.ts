import { describe, expect, it } from "vitest";
import {
  ACTIVE_COLOR_STORE, loadActiveColor, saveActiveColor
} from "../../src/core/color-prefs";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("active color preference", () => {
  it("round trips the latest valid RGB", () => {
    const storage = new MemoryStorage(); saveActiveColor([12, 34, 56], storage);
    expect(loadActiveColor([1, 2, 3], storage)).toEqual([12, 34, 56]);
  });

  it("uses a copied fallback for corrupt or out-of-range values", () => {
    const storage = new MemoryStorage(), fallback = [4, 5, 6];
    storage.values.set(ACTIVE_COLOR_STORE, JSON.stringify([0, 999, 2]));
    const loaded = loadActiveColor(fallback, storage);
    expect(loaded).toEqual(fallback); expect(loaded).not.toBe(fallback);
    storage.values.set(ACTIVE_COLOR_STORE, "{");
    expect(loadActiveColor(fallback, storage)).toEqual(fallback);
  });
});
