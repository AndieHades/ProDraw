import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { BrushLibraryStoragePort } from "../../src/contracts/brushStorage";
import { BrushLibraryService } from "../../src/core/brush-library/BrushLibraryService";

class MemoryBrushStorage implements BrushLibraryStoragePort {
  readonly files = new Map<string, Uint8Array<ArrayBuffer>>();
  readonly seeded = new Set(["Main"]);
  readonly trashed: string[] = [];

  constructor() {
    for (const brush of BUNDLED_BRUSHES) {
      this.files.set(`Main/${brush.fileName}`, new Uint8Array());
    }
  }

  async ensureSeeded(setName: string): Promise<void> {
    this.seeded.add(setName);
  }

  async listSets() {
    const names = new Set([...this.files.keys()].map((key) => key.split("/")[0] ?? ""));
    return [...names].filter(Boolean).map((name) => ({ name, seeded: this.seeded.has(name),
      files: [...this.files.keys()].filter((key) => key.startsWith(`${name}/`))
        .map((key) => ({ fileName: key.slice(name.length + 1),
          byteLength: this.files.get(key)?.byteLength ?? 0, modifiedAt: 1 })) }));
  }

  async readFile(setName: string, fileName: string) {
    const bytes = this.files.get(`${setName}/${fileName}`);
    if (!bytes) throw new Error("missing file");
    return bytes.slice();
  }

  async writeFile(setName: string, fileName: string, bytes: Uint8Array<ArrayBuffer>) {
    const key = `${setName}/${fileName}`;
    if (this.files.has(key)) throw new Error("duplicate file");
    this.files.set(key, bytes.slice());
  }

  async trashFile(setName: string, fileName: string) {
    const key = `${setName}/${fileName}`;
    if (!this.files.delete(key)) throw new Error("missing file");
    this.trashed.push(key);
  }

  async createSet(setName: string) { this.seeded.add(setName); }
  async renameSet(from: string, to: string) {
    for (const [key, bytes] of [...this.files]) {
      if (!key.startsWith(`${from}/`)) continue;
      this.files.delete(key);
      this.files.set(`${to}/${key.slice(from.length + 1)}`, bytes);
    }
  }
  async moveFile(fromSet: string, toSet: string, fileName: string) {
    const bytes = await this.readFile(fromSet, fileName);
    await this.writeFile(toSet, fileName, bytes);
    this.files.delete(`${fromSet}/${fileName}`);
  }
}

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
    expect(reopened.snapshot.sets[0]?.brushes.some(({ id: brushId }) =>
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
});
