import { describe, expect, it } from "vitest";
import { selectedPoints, selectionHit,
  selectionIntersectsRect } from "../../src/core/selection/SelectionGeometry";

describe("typed selection geometry", () => {
  it("queries sparse lasso cells inside the active bounds", () => {
    const mask = new Set(["1,1", "4,4", "9,9"]);
    const selection = { x0: 0, y0: 0, x1: 5, y1: 5 };
    expect([...selectedPoints(selection, mask)]).toEqual([[1, 1], [4, 4]]);
    expect(selectionHit(selection, mask, 1, 1)).toBe(true);
    expect(selectionHit(selection, mask, 2, 2)).toBe(false);
  });

  it("detects intersections without expanding a sparse mask", () => {
    const mask = new Set(["8,8"]), selection = { x0: 0, y0: 0, x1: 9, y1: 9 };
    expect(selectionIntersectsRect(selection, mask,
      { x0: 7, y0: 7, x1: 8, y1: 8 })).toBe(true);
    expect(selectionIntersectsRect(selection, mask,
      { x0: 0, y0: 0, x1: 5, y1: 5 })).toBe(false);
  });
});
