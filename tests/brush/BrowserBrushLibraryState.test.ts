import { describe, expect, it } from "vitest";
import { BrowserBrushLibraryState } from
  "../../src/platform/brush/BrowserBrushLibraryState";

class MemoryStorage {
  readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("BrowserBrushLibraryState", () => {
  it("round trips state through browser storage", async () => {
    const storage = new MemoryStorage();
    const state = new BrowserBrushLibraryState(storage);
    expect(await state.readState()).toBeNull();
    await state.writeState('{"activeBrushId":"lineart"}');
    expect(await new BrowserBrushLibraryState(storage).readState())
      .toBe('{"activeBrushId":"lineart"}');
  });
});
