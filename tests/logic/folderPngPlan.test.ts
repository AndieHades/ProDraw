import { describe, expect, it } from "vitest";
import { planFolderPngTree, planSelectedPngTree, safeExportSegment } from
  "../../src/logic/export/folderPngPlan.ts";

describe("folder PNG export plan", () => {
  it("preserves nesting while sanitizing and uniquing Windows paths", () => {
    const plan = planFolderPngTree({ kind: "folder", name: "Hero:*", children: [
      { kind: "layer", name: "face" },
      { kind: "layer", name: "FACE" },
      { kind: "folder", name: "Parts?", children: [
        { kind: "layer", name: "CON" },
        { kind: "layer", name: "тень" },
        { kind: "folder", name: "Empty" },
      ] },
    ] });
    expect(plan.rootName).toBe("Hero__");
    expect(plan.directories).toEqual([["Parts_"], ["Parts_", "Empty"]]);
    expect(plan.items.map(({ path }) => path)).toEqual([
      ["face.png"], ["FACE_2.png"],
      ["Parts_", "_CON.png"], ["Parts_", "тень.png"],
    ]);
  });

  it("uses safe fallbacks and rejects a layer root", () => {
    expect(safeExportSegment("... ", "Layer")).toBe("Layer");
    expect(() => planFolderPngTree({ kind: "layer", name: "Loose" })).toThrow();
  });

  it("keeps long file segments valid after adding PNG and collision suffixes", () => {
    const longName = "x".repeat(120);
    const plan = planFolderPngTree({ kind: "folder", name: "Root", children: [
      { kind: "layer", name: longName }, { kind: "layer", name: longName },
    ] });
    expect(plan.items.map(({ path }) => path[0]?.length)).toEqual([96, 96]);
    expect(plan.items[1]?.path[0]).toMatch(/_2\.png$/);
  });

  it("keeps multiple selected folders beneath one document root", () => {
    const plan = planSelectedPngTree("Character", [
      { kind: "layer", name: "Loose" },
      { kind: "folder", name: "Head", children: [
        { kind: "layer", name: "Hair" }, { kind: "folder", name: "Empty" },
      ] },
    ]);
    expect(plan.rootName).toBe("Character");
    expect(plan.directories).toEqual([["Head"], ["Head", "Empty"]]);
    expect(plan.items.map(({ path }) => path)).toEqual([
      ["Loose.png"], ["Head", "Hair.png"],
    ]);
  });
});
