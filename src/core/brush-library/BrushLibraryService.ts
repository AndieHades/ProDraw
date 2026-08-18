import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibrarySnapshot, BrushSetModel } from "../../contracts/brushLibrary";
import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import type {
  BrushLibraryStatePort, BrushLibraryStoragePort
} from "../../contracts/brushStorage";
import { uniqueBrushSetName } from "../../logic/brush/brushSetName";
import { BrushLibraryMetadata } from "./BrushLibraryMetadata";
import { BrushLibraryFileActions } from "./BrushLibraryFileActions";
import { loadBrushSets } from "./loadBrushLibrary";

type Listener = (snapshot: BrushLibrarySnapshot) => void;
export class BrushLibraryService implements BrushLibraryPort {
  readonly #storage: BrushLibraryStoragePort | null;
  readonly #listeners = new Set<Listener>();
  readonly #files: BrushLibraryFileActions;
  readonly #bundled: readonly BrushPreset[];
  #metadata: BrushLibraryMetadata;
  #sets: BrushSetModel[];

  private constructor(storage: BrushLibraryStoragePort | null, sets: readonly BrushSetModel[],
    metadata: BrushLibraryMetadata, bundled: readonly BrushPreset[], createId: () => string) {
    this.#storage = storage; this.#sets = metadata.orderSets(sets);
    this.#metadata = metadata; this.#bundled = bundled;
    this.#files = new BrushLibraryFileActions(storage, bundled, createId);
  }

  static async create(storage: BrushLibraryStoragePort | null, bundled: readonly BrushPreset[],
    createId: () => string = () => crypto.randomUUID(),
    stateStorage: BrushLibraryStatePort | null = storage): Promise<BrushLibraryService> {
    const sets = storage ? await loadBrushSets(storage, bundled) :
      [{ name: "Main", brushes: bundled }];
    const metadata = await BrushLibraryMetadata.create(stateStorage, sets);
    return new BrushLibraryService(storage, sets, metadata, bundled, createId);
  }

  get snapshot(): BrushLibrarySnapshot {
    return { sets: this.#sets, currentSetName: this.#metadata.currentSetName,
      activeBrushId: this.#metadata.activeBrushId,
      recentBrushIds: this.#metadata.recentBrushIds,
      favoriteBrushIds: this.#metadata.favoriteBrushIds,
      brushShortcuts: this.#metadata.brushShortcuts };
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener); listener(this.snapshot); return () => this.#listeners.delete(listener);
  }

  selectSet(name: string): void {
    this.requireSet(name); this.#metadata.selectSet(name); this.emit();
  }
  markRecent(id: string): void { this.#metadata.markRecent(id); this.emit(); }
  toggleFavorite(id: string): void { this.#metadata.toggleFavorite(id); this.emit(); }
  setShortcut(id: string, combo: string | null): void {
    this.#metadata.setShortcut(id, combo); this.emit(); }
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
    return this.add(await this.#files.copy(source, name, this.#metadata.currentSetName));
  }
  async duplicate(source: BrushPreset, name: string): Promise<BrushPreset> {
    return this.add(await this.#files.copy(source, name, source.setName));
  }

  async applyDraft(source: BrushPreset, draft: BrushPreset): Promise<BrushPreset> {
    const applied = await this.#files.apply(source, draft);
    this.replace(source, applied); return applied;
  }

  async delete(brush: BrushPreset): Promise<void> {
    await this.#files.trash(brush);
    this.#sets = this.#sets.map((set) => set.name === brush.setName
      ? { ...set, brushes: set.brushes.filter(({ id }) => id !== brush.id) } : set);
    this.#metadata.removeBrush(brush.setName, brush.id); this.emit();
  }

  async importFile(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<BrushPreset> {
    return this.add(await this.#files.importFile(this.#metadata.currentSetName, name, bytes));
  }
  exportFile(brush: BrushPreset) { return this.#files.exportFile(brush); }
  async reset(brush: BrushPreset): Promise<BrushPreset> {
    return this.applyDraft(brush, await this.#files.resetDraft(brush));
  }
  async restoreTrash(): Promise<number> {
    const count = await this.#files.restoreTrash();
    if (!count || !this.#storage) return count;
    const sets = await loadBrushSets(this.#storage, this.#bundled);
    this.#metadata = await BrushLibraryMetadata.create(this.#storage, sets);
    this.#sets = this.#metadata.orderSets(sets); this.emit(); return count;
  }
  revealFolder(): Promise<void> { return this.#files.revealFolder(this.#metadata.currentSetName); }

  async move(brush: BrushPreset, toSet: string): Promise<BrushPreset> {
    this.requireSet(toSet);
    if (brush.setName === toSet) return brush;
    await this.#files.move(brush, toSet);
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

  private add(brush: BrushPreset): BrushPreset {
    const setName = brush.setName;
    this.#sets = this.#sets.map((set) => set.name === setName
      ? { ...set, brushes: [...set.brushes, brush] } : set);
    this.#metadata.addBrush(setName, brush.id); this.emit(); return brush;
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
