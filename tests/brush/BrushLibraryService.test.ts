import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { BrushLibraryService } from "../../src/core/brush-library/BrushLibraryService";
import { MemoryBrushStorage } from "./MemoryBrushStorage";

describe("BrushLibraryService", () => {
  it("writes created brushes to the current set and duplicates beside their source", async () => {
    const storage = new MemoryBrushStorage();
    let id = 0;
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES,
      () => `duplicate-${id += 1}`);
    const source = BUNDLED_BRUSHES[0]!;
    await library.createSet("Inks");
    const created = await library.create(source, "Fresh Ink");
    expect(storage.files.has(`Inks/${created.fileName}`)).toBe(true);
    const duplicate = await library.duplicate(source, "My Brush");
    expect(storage.files.has(`Main/${duplicate.fileName}`)).toBe(true);
    const draft = { ...duplicate,
      strokePath: { ...duplicate.strokePath, spacing: 0.77 } };
    const applied = await library.applyDraft(duplicate, draft);
    expect(applied.revision).toBe(2);
    expect(storage.files.has(`Main/${applied.fileName}`)).toBe(true);
    expect(storage.trashed).toContain(`Main/${duplicate.fileName}`);
    const reopened = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    expect(reopened.snapshot.sets.find(({ name }) => name === "Main")?.brushes.some(({ id: brushId }) =>
      brushId === duplicate.id)).toBe(true);
  });

  it("edits an original through an override and deletes both recoverably", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    const original = BUNDLED_BRUSHES[0]!;
    const applied = await library.applyDraft(original, {
      ...original, name: "Edited Base",
      rendering: { ...original.rendering, flow: 0.5 }
    });
    expect(applied.replacesFileName).toBe(original.fileName);
    await library.delete(applied);
    expect(storage.trashed).toContain(`Main/${applied.fileName}`);
    expect(storage.trashed).toContain(`Main/${original.fileName}`);
  });

  it("isolates corrupt native files and maintains smart collections", async () => {
    const storage = new MemoryBrushStorage();
    storage.files.set("Main/broken.prodraw-brush", new TextEncoder().encode("not json"));
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    const brush = BUNDLED_BRUSHES[1]!;
    expect(library.snapshot.sets[0]?.brushes).toHaveLength(BUNDLED_BRUSHES.length);
    library.markRecent(brush.id);
    library.toggleFavorite(brush.id);
    expect(library.snapshot.recentBrushIds).toEqual([brush.id]);
    expect(library.snapshot.favoriteBrushIds).toEqual([brush.id]);
    library.toggleFavorite(brush.id);
    expect(library.snapshot.favoriteBrushIds).toEqual([]);
  });

  it("persists selected set, smart collections, and authored order", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    const first = BUNDLED_BRUSHES[0]!;
    const second = BUNDLED_BRUSHES[1]!;
    await library.createSet("Inks");
    library.markRecent(first.id);
    library.toggleFavorite(second.id);
    library.reorderSet("Inks", "Main");
    library.reorderBrush("Main", second.id, first.id);
    await library.whenStateSaved();

    const reopened = await BrushLibraryService.create(storage, BUNDLED_BRUSHES);
    expect(reopened.snapshot.currentSetName).toBe("Inks");
    expect(reopened.snapshot.sets.map(({ name }) => name)).toEqual(["Inks", "Main"]);
    expect(reopened.snapshot.sets[1]?.brushes.slice(0, 2).map(({ id }) => id))
      .toEqual([second.id, first.id]);
    expect(reopened.snapshot.recentBrushIds).toEqual([first.id]);
    expect(reopened.snapshot.favoriteBrushIds).toEqual([second.id]);
  });

  it("renames, moves, and recoverably deletes user sets", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES,
      () => "custom-id");
    await library.createSet("Inks");
    const custom = await library.create(BUNDLED_BRUSHES[0]!, "Custom");
    await library.renameSet("Inks", "Lines");
    const renamed = library.snapshot.sets.find(({ name }) => name === "Lines")?.brushes[0];
    const moved = await library.move(renamed!, "Main");
    expect(moved.setName).toBe("Main");
    expect(storage.files.has(`Main/${custom.fileName}`)).toBe(true);
    await library.deleteSet("Lines");
    expect(storage.trashed).toContain("Lines/");
    await expect(library.renameSet("Main", "Core")).rejects.toThrow();
    await expect(library.deleteSet("Main")).rejects.toThrow();
  });
});
