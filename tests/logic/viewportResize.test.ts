import { describe, expect, it } from "vitest";
import { recentredViewOffset } from "../../src/logic/view/viewportResize.ts";

describe("viewport resize", () => {
  it("keeps the document point under the viewport centre", () => {
    expect(recentredViewOffset({ ox: 100, oy: 50 },
      { width: 800, height: 600 }, { width: 1000, height: 500 }))
      .toEqual({ ox: 200, oy: 0 });
  });

  it("leaves the offset alone when the previous size is unknown", () => {
    expect(recentredViewOffset({ ox: 7, oy: 9 },
      { width: 0, height: 0 }, { width: 800, height: 600 }))
      .toEqual({ ox: 7, oy: 9 });
  });

  it("is a no-op when the size does not change", () => {
    expect(recentredViewOffset({ ox: -3, oy: 4 },
      { width: 640, height: 480 }, { width: 640, height: 480 }))
      .toEqual({ ox: -3, oy: 4 });
  });
});
