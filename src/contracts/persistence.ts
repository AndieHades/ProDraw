import type { DocumentDescriptor, LayerDescriptor } from "./document";

export type AutosaveStatus = "saving" | "saved" | "save-failed";

export interface SerializedTile {
  readonly x: number;
  readonly y: number;
  readonly bytes: ArrayBuffer;
}

export interface SerializedLayer {
  readonly descriptor: LayerDescriptor;
  readonly tiles: readonly SerializedTile[];
}

export interface SerializedDocument {
  readonly version: 1;
  readonly descriptor: DocumentDescriptor;
  readonly activeLayerId: string;
  readonly layers: readonly SerializedLayer[];
  readonly savedAt: number;
}
