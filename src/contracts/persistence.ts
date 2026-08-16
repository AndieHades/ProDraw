import type { DocumentDescriptor, LayerDescriptor } from "./document";

export type AutosaveStatus = "saving" | "saved" | "save-failed";

export interface DocumentSessionSnapshot {
  readonly revision: number;
  readonly savedRevision: number;
  readonly nativeLocation: string | null;
}

export interface SerializedTile {
  readonly x: number;
  readonly y: number;
  readonly revision: number;
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

export interface RecoveryDocumentEntry {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: number;
  readonly latestGeneration: number;
  readonly previousGeneration: number | null;
  readonly session: DocumentSessionSnapshot;
}

export interface RecoveryIndexV1 {
  readonly format: "prodraw-recovery-index";
  readonly version: 1;
  readonly currentDocumentId: string | null;
  readonly documents: readonly RecoveryDocumentEntry[];
}

export interface StoredRecoveryGenerationV1 {
  readonly format: "prodraw-recovery-generation";
  readonly version: 1;
  readonly documentId: string;
  readonly generation: number;
  readonly session: DocumentSessionSnapshot;
  readonly document: SerializedDocument;
}

export interface RecoveryTileReference {
  readonly x: number;
  readonly y: number;
  readonly revision: number;
  readonly key: string;
}

export interface RecoveryLayerManifest {
  readonly descriptor: LayerDescriptor;
  readonly tiles: readonly RecoveryTileReference[];
}

export interface StoredRecoveryGenerationV2 {
  readonly format: "prodraw-recovery-generation";
  readonly version: 2;
  readonly documentId: string;
  readonly generation: number;
  readonly session: DocumentSessionSnapshot;
  readonly manifest: {
    readonly descriptor: DocumentDescriptor;
    readonly activeLayerId: string;
    readonly layers: readonly RecoveryLayerManifest[];
    readonly savedAt: number;
  };
}

export type StoredRecoveryGeneration =
  StoredRecoveryGenerationV1 | StoredRecoveryGenerationV2;

export interface RecoveryLoadResult {
  readonly status: "empty" | "current" | "previous" | "corrupt";
  readonly document: SerializedDocument | null;
  readonly session: DocumentSessionSnapshot | null;
}
