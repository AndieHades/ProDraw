import { describe, expect, it } from "vitest";
import { buildExportDocument, collectLayerIndices, exportTargetRoot,
  type ExportTreeState } from "../../src/core/export/ExportTree";

const state = (): ExportTreeState => ({ W: 20, H: 10, docName: "Work",
  layers: [{ name: "Outside", fid: null }, { name: "Large", fid: 1,
    visible: false }, { name: "Small", fid: 2 }],
  folders: [{ id: 1, name: "Root", parent: null },
    { id: 2, name: "Nested", parent: 1, visible: false }],
  cur: 2, selFolder: 1, marked: new Set([1, 2]), markedFolders: new Set([1, 2]) });

describe("typed contextual export tree", () => {
  it("includes hidden descendants exactly once for a selected folder", () => {
    const document = buildExportDocument(state(), "selected", true);
    expect(document.root).toHaveLength(1);
    expect(collectLayerIndices(document.root)).toEqual(new Set([1, 2]));
  });

  it("keeps visible filtering separate from explicit hidden export", () => {
    const value = state(), folder = value.folders[0]!;
    const visible = exportTargetRoot(value, folder, false);
    const hidden = exportTargetRoot(value, folder, true);
    expect(visible?.kind === "folder" && collectLayerIndices(visible.children))
      .toEqual(new Set());
    expect(hidden?.kind === "folder" && collectLayerIndices(hidden.children))
      .toEqual(new Set([1, 2]));
  });
});
