import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { BrushLibraryService } from
  "../../src/core/brush-library/BrushLibraryService";
import { MemoryBrushStorage } from "./MemoryBrushStorage";

describe("brush library preferences", () => {
  it("defaults to Lineart on a clean library", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    expect(library.snapshot.activeBrushId).toBe("lineart");
  });

  it("falls back to Lineart when saved brush no longer exists", async () => {
    const storage = new MemoryBrushStorage();
    storage.state = JSON.stringify({ format: "prodraw-brush-library", version: 2,
      currentSetName: "Main", setOrder: ["Main"], brushOrder: { Main: [] },
      recentBrushIds: [], favoriteBrushIds: [], activeBrushId: "deleted-brush" });
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    expect(library.snapshot.activeBrushId).toBe("lineart");
  });

  it("persists unique per-brush shortcuts and resolves conflicts", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    library.setShortcut("lineart", "3");
    library.setShortcut("sketching", "3");
    await library.whenStateSaved();
    const restored = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);

    expect(restored.snapshot.brushShortcuts).toEqual({ sketching: "3" });
    expect(JSON.parse(storage.state ?? "{}").version).toBe(3);
  });
});
