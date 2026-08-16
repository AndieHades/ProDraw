import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibrarySnapshot, BrushSetModel } from "../../contracts/brushLibrary";
import type { BrushLibraryStoragePort } from "../../contracts/brushStorage";
import { brushFileName } from "../../logic/brush/brushFileName";
import { clonePreset, presetFileBytes } from "./brushPresetFile";
import { loadBrushSets } from "./loadBrushLibrary";

type Listener = (snapshot: BrushLibrarySnapshot) => void;

export class BrushLibraryService {
  readonly #storage: BrushLibraryStoragePort | null;
  readonly #listeners = new Set<Listener>();
  readonly #createId: () => string;
  #sets: BrushSetModel[];
  #currentSetName = "Main";
  #recent: string[] = [];
  #favorites: string[] = [];

  private constructor(
    storage: BrushLibraryStoragePort | null,
    sets: readonly BrushSetModel[],
    createId: () => string
  ) {
    this.#storage = storage;
    this.#sets = [...sets];
    this.#createId = createId;
  }

  static async create(
    storage: BrushLibraryStoragePort | null,
    bundled: readonly BrushPreset[],
    createId: () => string = () => crypto.randomUUID()
  ): Promise<BrushLibraryService> {
    const sets = storage ? await loadBrushSets(storage, bundled) :
      [{ name: "Main", brushes: bundled }];
    return new BrushLibraryService(storage, sets, createId);
  }

  get snapshot(): BrushLibrarySnapshot {
    return { sets: this.#sets, currentSetName: this.#currentSetName,
      recentBrushIds: this.#recent, favoriteBrushIds: this.#favorites };
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  selectSet(name: string): void {
    if (!this.#sets.some((set) => set.name === name)) throw new Error(`Unknown brush set: ${name}`);
    this.#currentSetName = name;
    this.emit();
  }

  markRecent(id: string): void {
    this.#recent = [id, ...this.#recent.filter((candidate) => candidate !== id)].slice(0, 24);
    this.emit();
  }

  toggleFavorite(id: string): void {
    this.#favorites = this.#favorites.includes(id)
      ? this.#favorites.filter((candidate) => candidate !== id)
      : [id, ...this.#favorites];
    this.emit();
  }

  async createSet(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed || this.#sets.some((set) => set.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Brush set name must be unique");
    }
    await this.#storage?.createSet(trimmed);
    this.#sets = [...this.#sets, { name: trimmed, brushes: [] }];
    this.#currentSetName = trimmed;
    this.emit();
  }

  async create(source: BrushPreset, name: string): Promise<BrushPreset> {
    return this.copy(source, name, this.#currentSetName);
  }

  async duplicate(source: BrushPreset, copyName: string): Promise<BrushPreset> {
    return this.copy(source, copyName, source.setName);
  }

  private async copy(source: BrushPreset, copyName: string, setName: string): Promise<BrushPreset> {
    const id = this.#createId();
    const revision = 1;
    const duplicate: BrushPreset = { ...clonePreset(source), id, name: copyName,
      revision, setName, replacesFileName: null,
      fileName: brushFileName(copyName, id, revision) };
    await this.write(duplicate);
    this.insert(duplicate);
    return duplicate;
  }

  async applyDraft(source: BrushPreset, draft: BrushPreset): Promise<BrushPreset> {
    const revision = source.revision + 1;
    const fileName = brushFileName(draft.name, source.id, revision);
    const applied: BrushPreset = { ...clonePreset(draft), id: source.id, revision,
      setName: source.setName, fileName,
      replacesFileName: source.fileName.endsWith(".brush")
        ? source.fileName : source.replacesFileName };
    await this.write(applied);
    if (this.#storage && source.fileName.endsWith(".prodraw-brush")) {
      await this.#storage.trashFile(source.setName, source.fileName);
    }
    this.replace(source, applied);
    return applied;
  }

  async delete(brush: BrushPreset): Promise<void> {
    if (this.#storage) {
      await this.#storage.trashFile(brush.setName, brush.fileName);
      if (brush.replacesFileName) {
        await this.#storage.trashFile(brush.setName, brush.replacesFileName);
      }
    }
    this.#sets = this.#sets.map((set) => set.name === brush.setName
      ? { ...set, brushes: set.brushes.filter(({ id }) => id !== brush.id) } : set);
    this.#recent = this.#recent.filter((id) => id !== brush.id);
    this.#favorites = this.#favorites.filter((id) => id !== brush.id);
    this.emit();
  }

  private async write(brush: BrushPreset): Promise<void> {
    await this.#storage?.writeFile(brush.setName, brush.fileName, presetFileBytes(brush));
  }

  private insert(brush: BrushPreset): void {
    this.#sets = this.#sets.map((set) => set.name === brush.setName
      ? { ...set, brushes: [...set.brushes, brush] } : set);
    this.emit();
  }

  private replace(source: BrushPreset, applied: BrushPreset): void {
    this.#sets = this.#sets.map((set) => set.name === source.setName
      ? { ...set, brushes: set.brushes.map((brush) =>
        brush.id === source.id ? applied : brush) } : set);
    this.emit();
  }

  private emit(): void {
    for (const listener of this.#listeners) listener(this.snapshot);
  }
}
