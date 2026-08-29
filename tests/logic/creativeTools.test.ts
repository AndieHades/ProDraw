import { describe, expect, it } from "vitest";
import { adjustBrushColor } from "../../src/logic/AdjustBrushColor.ts";
import { bres, closedContourMask, ellipseFill,
  rectEdges } from "../../src/logic/ShapeGeometry.ts";
import { isInsideTileWorkArea, tileRenderBlock,
  wrapTilePoint } from "../../src/logic/TileGeometry.ts";
import { normalizeTextSource, transformTextSource } from "../../src/logic/text-model.ts";
import { generateHarmonyBaseColors, generateTints } from "../../src/logic/tint-shade.ts";
import { resizeTextBox, textFrameHit, textRasterBounds } from "../../src/logic/TextGeometry.ts";

const points = (draw: (visit: (x: number, y: number) => void) => void): string[] => {
  const output: string[] = []; draw((x, y) => output.push(`${x},${y}`)); return output;
};

describe("typed creative tool owners", () => {
  it("owns line, rectangle and ellipse geometry", () => {
    expect(points((visit) => bres(0, 0, 3, 0, visit)))
      .toEqual(["0,0", "1,0", "2,0", "3,0"]);
    expect(new Set(points((visit) => rectEdges(1, 1, 3, 2, visit))))
      .toEqual(new Set(["1,1", "2,1", "3,1", "1,2", "2,2", "3,2"]));
    expect(new Set(points((visit) => ellipseFill(0, 0, 4, 4, visit))).size).toBeGreaterThan(8);
  });

  it("fills a closed contour without leaking outside", () => {
    const polygon = [[1, 1], [4, 1], [4, 4], [1, 4]] as const;
    const mask = closedContourMask(polygon, 8, 8, (output, a, b) =>
      bres(a[0], a[1], b[0], b[1], (x, y) => output.add(`${x},${y}`)));
    expect(mask.has("2,2")).toBe(true); expect(mask.has("0,0")).toBe(false);
  });

  it("applies bounded dodge, burn and monochrome color", () => {
    expect(adjustBrushColor([10, 20, 30, 120], "dodge", [1, 2, 3], 100))
      .toEqual([255, 255, 255, 120]);
    expect(adjustBrushColor([10, 20, 30], "burn", [1, 2, 3], 100))
      .toEqual([0, 0, 0, 255]);
    const mono = adjustBrushColor([100, 20, 0], "mono", [1, 2, 3], 100);
    expect(mono[0]).toBe(mono[1]); expect(mono[1]).toBe(mono[2]);
  });

  it("wraps Tile Mode through one geometry owner", () => {
    expect(wrapTilePoint(-1, 9, 8, 8)).toEqual([7, 1]);
    expect(isInsideTileWorkArea(-8, 15, 8, 8, true)).toBe(true);
    expect(isInsideTileWorkArea(-1, 0, 8, 8, false)).toBe(false);
    expect(tileRenderBlock(10, 20, 80, 40, true))
      .toEqual({ x: -70, y: -20, width: 240, height: 120 });
  });

  it("normalizes editable text and preserves one transform source", () => {
    const source = normalizeTextSource({ value: "Title", size: 20,
      box: { x: 2, y: 3, w: 40, h: 12 } });
    const moved = transformTextSource(source, { tx: 4, ty: -2, sx: 2, ang: 15 });
    expect(moved.box).toEqual({ x: 6, y: 1, w: 40, h: 12 });
    expect(moved.transform.scaleX).toBe(2); expect(moved.transform.rotation).toBe(15);
    expect(textFrameHit(source, 2, 9, 1)).toBe("l");
    expect(resizeTextBox(source, source.box, "r", 50, 9).w).toBe(48);
    expect(textRasterBounds(source, 100, 100)).not.toBeNull();
  });

  it("keeps five-color tint scales and configured harmonies", () => {
    expect(generateTints([10, 20, 30])).toHaveLength(5);
    expect(generateHarmonyBaseColors([255, 0, 0], "triadic")).toHaveLength(2);
  });
});
