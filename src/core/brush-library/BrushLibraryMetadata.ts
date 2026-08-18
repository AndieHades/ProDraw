import type { BrushLibraryStoredStateV3, BrushSetModel } from "../../contracts/brushLibrary";
import type { BrushLibraryStatePort } from "../../contracts/brushStorage";
import { normalizeBrushLibraryState } from "./normalizeBrushLibraryState";

function reordered(values: readonly string[], value: string, before: string | null): string[] {
  const output = values.filter((candidate) => candidate !== value);
  const index = before ? output.indexOf(before) : -1;
  output.splice(index < 0 ? output.length : index, 0, value);
  return output;
}

export class BrushLibraryMetadata {
  readonly #storage: BrushLibraryStatePort | null;
  #currentSetName: string;
  #setOrder: string[];
  #brushOrder: Record<string, string[]>;
  #recent: string[];
  #favorites: string[];
  #active: string | null;
  #shortcuts: Record<string, string>;
  #saving: Promise<void> = Promise.resolve();

  private constructor(storage: BrushLibraryStatePort | null,
    currentSetName: string, setOrder: string[], brushOrder: Record<string, string[]>,
    recent: string[], favorites: string[], active: string | null,
    shortcuts: Record<string, string>) {
    this.#storage = storage;
    this.#currentSetName = currentSetName;
    this.#setOrder = setOrder;
    this.#brushOrder = brushOrder;
    this.#recent = recent;
    this.#favorites = favorites;
    this.#active = active;
    this.#shortcuts = shortcuts;
  }

  static async create(storage: BrushLibraryStatePort | null, sets: readonly BrushSetModel[]) {
    const state = await normalizeBrushLibraryState(storage, sets);
    return new BrushLibraryMetadata(storage, state.currentSetName, state.setOrder,
      state.brushOrder, state.recent, state.favorites, state.active, state.shortcuts);
  }

  get currentSetName(): string { return this.#currentSetName; }
  get recentBrushIds(): readonly string[] { return this.#recent; }
  get favoriteBrushIds(): readonly string[] { return this.#favorites; }
  get activeBrushId(): string | null { return this.#active; }
  get brushShortcuts(): Readonly<Record<string, string>> { return { ...this.#shortcuts }; }

  orderSets(sets: readonly BrushSetModel[]): BrushSetModel[] {
    const rank = new Map(this.#setOrder.map((name, index) => [name, index]));
    return sets.map((set) => {
      const brushRank = new Map((this.#brushOrder[set.name] ?? [])
        .map((id, index) => [id, index]));
      return { ...set, brushes: [...set.brushes].sort((left, right) =>
        (brushRank.get(left.id) ?? 1e9) - (brushRank.get(right.id) ?? 1e9)) };
    }).sort((left, right) => (rank.get(left.name) ?? 1e9) - (rank.get(right.name) ?? 1e9));
  }

  selectSet(name: string): void { this.#currentSetName = name; this.save(); }
  markRecent(id: string): void {
    this.#active = id;
    this.#recent = [id, ...this.#recent.filter((candidate) => candidate !== id)].slice(0, 24);
    this.save();
  }
  toggleFavorite(id: string): void {
    this.#favorites = this.#favorites.includes(id)
      ? this.#favorites.filter((candidate) => candidate !== id) : [id, ...this.#favorites];
    this.save();
  }
  setShortcut(id: string, combo: string | null): void {
    for (const [brushId, assigned] of Object.entries(this.#shortcuts)) {
      if (brushId === id || assigned === combo) delete this.#shortcuts[brushId];
    }
    if (combo) this.#shortcuts[id] = combo;
    this.save();
  }
  addSet(name: string): void {
    this.#setOrder.push(name); this.#brushOrder[name] = [];
    this.#currentSetName = name; this.save();
  }
  renameSet(from: string, to: string): void {
    this.#setOrder = this.#setOrder.map((name) => name === from ? to : name);
    this.#brushOrder[to] = this.#brushOrder[from] ?? [];
    delete this.#brushOrder[from];
    if (this.#currentSetName === from) this.#currentSetName = to;
    this.save();
  }
  removeSet(name: string, brushIds: readonly string[]): void {
    this.#setOrder = this.#setOrder.filter((candidate) => candidate !== name);
    delete this.#brushOrder[name];
    for (const id of brushIds) this.removeBrushReferences(id);
    this.#currentSetName = this.#currentSetName === name ? this.#setOrder[0] ?? "Main" : this.#currentSetName;
    this.save();
  }
  addBrush(setName: string, id: string): void {
    this.#brushOrder[setName] = [...(this.#brushOrder[setName] ?? []), id]; this.save();
  }
  removeBrush(setName: string, id: string): void {
    this.#brushOrder[setName] = (this.#brushOrder[setName] ?? []).filter((item) => item !== id);
    this.removeBrushReferences(id); this.save();
  }
  moveBrush(id: string, from: string, to: string): void {
    this.#brushOrder[from] = (this.#brushOrder[from] ?? []).filter((item) => item !== id);
    this.#brushOrder[to] = [...(this.#brushOrder[to] ?? []), id]; this.save();
  }
  reorderSet(name: string, before: string | null): void {
    this.#setOrder = reordered(this.#setOrder, name, before); this.save();
  }
  reorderBrush(setName: string, id: string, before: string | null): void {
    this.#brushOrder[setName] = reordered(this.#brushOrder[setName] ?? [], id, before); this.save();
  }
  whenSaved(): Promise<void> { return this.#saving; }

  private removeBrushReferences(id: string): void {
    this.#recent = this.#recent.filter((item) => item !== id);
    this.#favorites = this.#favorites.filter((item) => item !== id);
    if (this.#active === id) this.#active = null;
    delete this.#shortcuts[id];
  }

  private save(): void {
    if (!this.#storage) return;
    const state: BrushLibraryStoredStateV3 = { format: "prodraw-brush-library", version: 3,
      currentSetName: this.#currentSetName, setOrder: this.#setOrder,
      brushOrder: this.#brushOrder, recentBrushIds: this.#recent,
      favoriteBrushIds: this.#favorites, activeBrushId: this.#active,
      brushShortcuts: this.#shortcuts };
    this.#saving = this.#saving.catch(() => undefined).then(() =>
      this.#storage!.writeState(JSON.stringify(state)));
  }
}
