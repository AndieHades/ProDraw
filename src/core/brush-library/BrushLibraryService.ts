import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibrarySnapshot, BrushSetModel } from "../../contracts/brushLibrary";
import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import type { BrushLibraryStoragePort } from "../../contracts/brushStorage";
import { brushFileName } from "../../logic/brush/brushFileName";
import { uniqueBrushSetName } from "../../logic/brush/brushSetName";
import { cloneBrushPreset } from "../../logic/brush/cloneBrushPreset";
import { BrushLibraryMetadata } from "./BrushLibraryMetadata";
import { presetFileBytes } from "./brushPresetFile";
import { loadBrushSets } from "./loadBrushLibrary";
import { moveBrushFiles } from "./moveBrushFiles";

type Listener = (snapshot: BrushLibrarySnapshot) => void;
export class BrushLibraryService implements BrushLibraryPort {
  readonly #storage: BrushLibraryStoragePort | null;
  readonly #listeners = new Set<Listener>();
  readonly #createId: () => string;
  readonly #metadata: BrushLibraryMetadata;
  #sets: BrushSetModel[];

  private constructor(storage: BrushLibraryStoragePort | null, sets: readonly BrushSetModel[],
    metadata: BrushLibraryMetadata, createId: () => string) {
    this.#storage = storage; this.#sets = metadata.orderSets(sets);
    this.#metadata = metadata; this.#createId = createId;
  }

  static async create(storage: BrushLibraryStoragePort | null, bundled: readonly BrushPreset[],
    createId: () => string = () => crypto.randomUUID()): Promise<BrushLibraryService> {
    const sets = storage ? await loadBrushSets(storage, bundled) :
      [{ name: "Main", brushes: bundled }];
    const metadata = await BrushLibraryMetadata.create(storage, sets);
    return new BrushLibraryService(storage, sets, metadata, createId);
  }

  get snapshot(): BrushLibrarySnapshot {
    return { sets: this.#sets, currentSetName: this.#metadata.currentSetName,
      recentBrushIds: this.#metadata.recentBrushIds,
      favoriteBrushIds: this.#metadata.favoriteBrushIds };
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener); listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  selectSet(name: string): void {
    this.requireSet(name); this.#metadata.selectSet(name); this.emit();
  }
  markRecent(id: string): void { this.#metadata.markRecent(id); this.emit(); }
  toggleFavorite(id: string): void { this.#metadata.toggleFavorite(id); this.emit(); }
  whenStateSaved(): Promise<void> { return this.#metadata.whenSaved(); }

  async createSet(name: string): Promise<void> {
    const trimmed = uniqueBrushSetName(name, this.#sets.map((set) => set.name));
    await this.#storage?.createSet(trimmed);
    this.#sets = [...this.#sets, { name: trimmed, brushes: [] }];
    this.#metadata.addSet(trimmed); this.emit();
  }

  async renameSet(from: string, name: string): Promise<void> {
    if (from === "Main") throw new Error("Main brush set cannot be renamed");
    this.requireSet(from);
    const to = uniqueBrushSetName(name, this.#sets.map((set) => set.name));
    await this.#storage?.renameSet(from, to);
    this.#sets = this.#sets.map((set) => set.name === from
      ? { name: to, brushes: set.brushes.map((brush) => ({ ...brush, setName: to })) } : set);
    this.#metadata.renameSet(from, to); this.emit();
  }

  async deleteSet(name: string): Promise<void> {
    if (name === "Main") throw new Error("Main brush set cannot be deleted");
    const set = this.requireSet(name);
    await this.#storage?.trashSet(name);
    this.#sets = this.#sets.filter((candidate) => candidate.name !== name);
    this.#metadata.removeSet(name, set.brushes.map(({ id }) => id)); this.emit();
  }

  async create(source: BrushPreset, name: string): Promise<BrushPreset> {
    return this.copy(source, name, this.#metadata.currentSetName);
  }
  async duplicate(source: BrushPreset, name: string): Promise<BrushPreset> {
    return this.copy(source, name, source.setName);
  }

  async applyDraft(source: BrushPreset, draft: BrushPreset): Promise<BrushPreset> {
    const revision = source.revision + 1;
    const applied: BrushPreset = { ...cloneBrushPreset(draft), id: source.id, revision,
      setName: source.setName, fileName: brushFileName(draft.name, source.id, revision),
      replacesFileName: source.fileName.endsWith(".brush")
        ? source.fileName : source.replacesFileName };
    await this.write(applied);
    if (this.#storage && source.fileName.endsWith(".prodraw-brush")) {
      await this.#storage.trashFile(source.setName, source.fileName);
    }
    this.replace(source, applied); return applied;
  }

  async delete(brush: BrushPreset): Promise<void> {
    if (this.#storage) {
      await this.#storage.trashFile(brush.setName, brush.fileName);
      if (brush.replacesFileName) await this.#storage.trashFile(brush.setName, brush.replacesFileName);
    }
    this.#sets = this.#sets.map((set) => set.name === brush.setName
      ? { ...set, brushes: set.brushes.filter(({ id }) => id !== brush.id) } : set);
    this.#metadata.removeBrush(brush.setName, brush.id); this.emit();
  }

  async move(brush: BrushPreset, toSet: string): Promise<BrushPreset> {
    this.requireSet(toSet);
    if (brush.setName === toSet) return brush;
    await moveBrushFiles(this.#storage, brush, toSet);
    const result = { ...brush, setName: toSet };
    this.#sets = this.#sets.map((set) => set.name === brush.setName
      ? { ...set, brushes: set.brushes.filter(({ id }) => id !== brush.id) }
      : set.name === toSet ? { ...set, brushes: [...set.brushes, result] } : set);
    this.#metadata.moveBrush(brush.id, brush.setName, toSet); this.emit(); return result;
  }

  reorderSet(name: string, before: string | null): void {
    this.#metadata.reorderSet(name, before); this.#sets = this.#metadata.orderSets(this.#sets); this.emit();
  }
  reorderBrush(setName: string, id: string, before: string | null): void {
    this.#metadata.reorderBrush(setName, id, before); this.#sets = this.#metadata.orderSets(this.#sets); this.emit();
  }

  private async copy(source: BrushPreset, name: string, setName: string): Promise<BrushPreset> {
    const id = this.#createId();
    const brush: BrushPreset = { ...cloneBrushPreset(source), id, name, revision: 1, setName,
      replacesFileName: null, fileName: brushFileName(name, id, 1) };
    await this.write(brush);
    this.#sets = this.#sets.map((set) => set.name === setName
      ? { ...set, brushes: [...set.brushes, brush] } : set);
    this.#metadata.addBrush(setName, id); this.emit(); return brush;
  }

  private write(brush: BrushPreset): Promise<void> {
    return this.#storage?.writeFile(brush.setName, brush.fileName, presetFileBytes(brush)) ??
      Promise.resolve();
  }
  private replace(source: BrushPreset, applied: BrushPreset): void {
    this.#sets = this.#sets.map((set) => set.name === source.setName
      ? { ...set, brushes: set.brushes.map((brush) => brush.id === source.id ? applied : brush) }
      : set); this.emit();
  }
  private requireSet(name: string): BrushSetModel {
    const set = this.#sets.find((candidate) => candidate.name === name);
    if (!set) throw new Error(`Unknown brush set: ${name}`); return set;
  }
  private emit(): void { for (const listener of this.#listeners) listener(this.snapshot); }
}
