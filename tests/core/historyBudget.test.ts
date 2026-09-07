import { describe, expect, it } from "vitest";
import { historyEntryBytes,
  trimHistoryStack } from "../../src/core/history/historyBudget.ts";

const tileEntry = (bytes: number) => ({ kind: "legacy-tile-patch",
  changeSet: { label: "t", patches: [{ surfaceId: "s", x: 0, y: 0,
    before: new Uint8ClampedArray(bytes), after: null }] } });

describe("history byte budget", () => {
  it("charges a tile patch for both sides of every tile", () => {
    expect(historyEntryBytes(tileEntry(64))).toBe(64);
    expect(historyEntryBytes({ kind: "legacy-tile-patch", changeSet: {
      label: "t", patches: [{ surfaceId: "s", x: 0, y: 0,
        before: new Uint8ClampedArray(8), after: new Uint8ClampedArray(8) }] } }))
      .toBe(16);
  });

  it("charges pixel patches by retained cells and a promoted snapshot densely", () => {
    expect(historyEntryBytes({ kind: "pixel-patch", width: 4, height: 4,
      cells: new Map([[1, null], [2, null]]) })).toBe(96);
    expect(historyEntryBytes({ kind: "pixel-patch", width: 4, height: 4,
      cells: new Map(), snapshot: [] })).toBe(64);
    expect(historyEntryBytes({ kind: "pixel-batch", patches: [
      { width: 2, height: 2, cells: new Map([[0, null]]) },
      { width: 2, height: 2, cells: new Map() }] })).toBe(48);
  });

  it("charges a document snapshot for one dense grid per layer", () => {
    expect(historyEntryBytes({ W: 10, H: 10, layers: [{}, {}] })).toBe(800);
  });

  it("evicts the oldest entries until the retained bytes fit", () => {
    const stack = [tileEntry(100), tileEntry(100), tileEntry(100)];
    expect(trimHistoryStack(stack, 250, 100)).toBe(1);
    expect(stack).toHaveLength(2);
  });

  it("keeps the newest entry even when it alone exceeds the budget", () => {
    const stack = [tileEntry(10), tileEntry(4096)];
    trimHistoryStack(stack, 100, 100);
    expect(stack).toHaveLength(1);
    expect(historyEntryBytes(stack[0])).toBe(4096);
  });

  it("still honours the entry ceiling", () => {
    const stack = [tileEntry(1), tileEntry(1), tileEntry(1), tileEntry(1)];
    expect(trimHistoryStack(stack, 1024 * 1024, 2)).toBe(2);
    expect(stack).toHaveLength(2);
  });

  it("keeps a thousand small stroke patches inside the default budget", () => {
    const stack = Array.from({ length: 1000 }, () => tileEntry(256 * 256 * 4));
    trimHistoryStack(stack);
    expect(stack.length).toBe(100);
  });
});
