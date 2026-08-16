import { RASTER_LIMITS } from "../../config/raster";
import type { RasterSurface } from "../raster/RasterSurface";
import { RasterEdit } from "./RasterEdit";
import type { TileChangeSet, TilePatch } from "./tilePatch";

export class TileHistory {
  readonly #surfaces = new Map<string, RasterSurface>();
  readonly #undo: TileChangeSet[] = [];
  readonly #redo: TileChangeSet[] = [];
  readonly #limit: number;

  constructor(limit: number = RASTER_LIMITS.maximumHistoryEntries) {
    this.#limit = limit;
  }

  get undoCount(): number {
    return this.#undo.length;
  }

  get redoCount(): number {
    return this.#redo.length;
  }

  registerSurface(surface: RasterSurface): void {
    this.#surfaces.set(surface.id, surface);
  }

  forgetSurface(id: string): void {
    this.#surfaces.delete(id);
  }

  begin(surface: RasterSurface, label: string): RasterEdit {
    if (this.#surfaces.get(surface.id) !== surface) this.registerSurface(surface);
    return new RasterEdit(surface, label);
  }

  record(changeSet: TileChangeSet | null): boolean {
    if (!changeSet) return false;
    this.#undo.push(changeSet);
    if (this.#undo.length > this.#limit) this.#undo.shift();
    this.#redo.length = 0;
    return true;
  }

  undo(): TileChangeSet | null {
    const changeSet = this.#undo.pop();
    if (!changeSet) return null;
    this.apply(changeSet.patches, "before");
    this.#redo.push(changeSet);
    return changeSet;
  }

  redo(): TileChangeSet | null {
    const changeSet = this.#redo.pop();
    if (!changeSet) return null;
    this.apply(changeSet.patches, "after");
    this.#undo.push(changeSet);
    return changeSet;
  }

  clear(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
  }

  private apply(patches: readonly TilePatch[], side: "before" | "after"): void {
    for (const patch of patches) {
      const surface = this.#surfaces.get(patch.surfaceId);
      if (!surface) throw new Error(`History surface is unavailable: ${patch.surfaceId}`);
      surface.replaceTile(patch.x, patch.y, patch[side]);
    }
  }
}
