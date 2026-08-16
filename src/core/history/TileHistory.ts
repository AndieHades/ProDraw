import { RASTER_LIMITS } from "../../config/raster";
import type { RasterSurface } from "../raster/RasterSurface";
import { RasterEdit } from "./RasterEdit";
import { changeSetBytes, type TileChangeSet, type TilePatch } from "./tilePatch";

export class TileHistory {
  readonly #surfaces = new Map<string, RasterSurface>();
  readonly #undo: TileChangeSet[] = [];
  readonly #redo: TileChangeSet[] = [];
  readonly #limit: number;
  readonly #byteLimit: number;
  #undoBytes = 0;
  #redoBytes = 0;

  constructor(limit: number = RASTER_LIMITS.maximumHistoryEntries,
    byteLimit: number = RASTER_LIMITS.maximumHistoryBytes) {
    this.#limit = limit;
    this.#byteLimit = byteLimit;
  }

  get undoCount(): number {
    return this.#undo.length;
  }

  get redoCount(): number {
    return this.#redo.length;
  }
  get undoBytes(): number { return this.#undoBytes; }
  get redoBytes(): number { return this.#redoBytes; }

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
    const bytes = changeSetBytes(changeSet);
    if (bytes <= this.#byteLimit) {
      this.#undo.push(changeSet);
      this.#undoBytes += bytes;
      while (this.#undo.length > this.#limit || this.#undoBytes > this.#byteLimit) {
        const removed = this.#undo.shift();
        if (removed) this.#undoBytes -= changeSetBytes(removed);
      }
    }
    this.#redo.length = 0;
    this.#redoBytes = 0;
    return true;
  }

  undo(): TileChangeSet | null {
    const changeSet = this.#undo.pop();
    if (!changeSet) return null;
    const bytes = changeSetBytes(changeSet);
    this.#undoBytes -= bytes;
    this.apply(changeSet.patches, "before");
    this.#redo.push(changeSet);
    this.#redoBytes += bytes;
    return changeSet;
  }

  redo(): TileChangeSet | null {
    const changeSet = this.#redo.pop();
    if (!changeSet) return null;
    const bytes = changeSetBytes(changeSet);
    this.#redoBytes -= bytes;
    this.apply(changeSet.patches, "after");
    this.#undo.push(changeSet);
    this.#undoBytes += bytes;
    return changeSet;
  }

  clear(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#undoBytes = 0;
    this.#redoBytes = 0;
  }

  reset(): void {
    this.clear();
    this.#surfaces.clear();
  }

  private apply(patches: readonly TilePatch[], side: "before" | "after"): void {
    for (const patch of patches) {
      const surface = this.#surfaces.get(patch.surfaceId);
      if (!surface) throw new Error(`History surface is unavailable: ${patch.surfaceId}`);
      surface.replaceTile(patch.x, patch.y, patch[side]);
    }
  }
}
