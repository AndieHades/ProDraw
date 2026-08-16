import type { BrushPreset } from "./brush";
import type { BrushExportFile, BrushLibrarySnapshot } from "./brushLibrary";

export interface BrushLibraryPort {
  readonly snapshot: BrushLibrarySnapshot;
  subscribe(listener: (snapshot: BrushLibrarySnapshot) => void): () => void;
  selectSet(name: string): void;
  markRecent(id: string): void;
  toggleFavorite(id: string): void;
  whenStateSaved(): Promise<void>;
  createSet(name: string): Promise<void>;
  renameSet(from: string, name: string): Promise<void>;
  deleteSet(name: string): Promise<void>;
  create(source: BrushPreset, name: string): Promise<BrushPreset>;
  duplicate(source: BrushPreset, name: string): Promise<BrushPreset>;
  applyDraft(source: BrushPreset, draft: BrushPreset): Promise<BrushPreset>;
  delete(brush: BrushPreset): Promise<void>;
  importFile(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<BrushPreset>;
  exportFile(brush: BrushPreset): Promise<BrushExportFile>;
  reset(brush: BrushPreset): Promise<BrushPreset>;
  restoreTrash(): Promise<number>;
  revealFolder(): Promise<void>;
  move(brush: BrushPreset, toSet: string): Promise<BrushPreset>;
  reorderSet(name: string, before: string | null): void;
  reorderBrush(setName: string, id: string, before: string | null): void;
}
