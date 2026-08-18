import { describe, expect, it } from "vitest";
import { planFolderPngTree, safeExportSegment } from
  "../../src/logic/export/folderPngPlan.ts";

describe("folder PNG export plan", () => {
  it("preserves nesting while sanitizing and uniquing Windows paths", () => {
    const plan = planFolderPngTree({ kind: "folder", name: "Hero:*", children: [
      { kind: "layer", name: "face" },
      { kind: "layer", name: "FACE" },
      { kind: "folder", name: "Parts?", children: [
        { kind: "layer", name: "CON" },
        { kind: "layer", name: "тень" },
      ] },
    ] });
    expect(plan.rootName).toBe("Hero__");
    expect(plan.items.map(({ path }) => path)).toEqual([
      ["face.png"], ["FACE_2.png"],
      ["Parts_", "_CON.png"], ["Parts_", "тень.png"],
    ]);
  });

  it("uses safe fallbacks and rejects a layer root", () => {
    expect(safeExportSegment("... ", "Layer")).toBe("Layer");
    expect(() => planFolderPngTree({ kind: "layer", name: "Loose" })).toThrow();
  });
});
