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
