import type { BrushPreset } from "./brush";

export type BrushPresetFileV1 = Omit<
  BrushPreset,
  "setName" | "fileName" | "sourceUrl"
>;

export interface BrushSetModel {
  readonly name: string;
  readonly brushes: readonly BrushPreset[];
}

export interface BrushLibrarySnapshot {
  readonly sets: readonly BrushSetModel[];
  readonly currentSetName: string;
  readonly recentBrushIds: readonly string[];
  readonly favoriteBrushIds: readonly string[];
}

export interface BrushLibraryStoredStateV1 {
  readonly format: "prodraw-brush-library";
  readonly version: 1;
  readonly currentSetName: string;
  readonly setOrder: readonly string[];
  readonly brushOrder: Readonly<Record<string, readonly string[]>>;
  readonly recentBrushIds: readonly string[];
  readonly favoriteBrushIds: readonly string[];
}
