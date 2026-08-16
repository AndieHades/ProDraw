import type { DocumentDescriptor, LayerDescriptor } from "./document";
import type { ViewState } from "./view";

export interface HistoryViewModel {
  readonly undoCount: number;
  readonly redoCount: number;
  readonly undoBytes: number;
  readonly redoBytes: number;
}

export interface LayerListViewModel {
  readonly activeLayerId: string;
  readonly layers: readonly LayerDescriptor[];
}

export interface DocumentSessionViewModel {
  readonly revision: number;
  readonly savedRevision: number;
  readonly dirty: boolean;
  readonly hasNativeLocation: boolean;
}

export interface EditorViewModel {
  readonly document: DocumentDescriptor;
  readonly history: HistoryViewModel;
  readonly layers: LayerListViewModel;
  readonly view: ViewState;
  readonly brushName: string;
  readonly session: DocumentSessionViewModel;
}

export interface CanvasTileViewModel {
  readonly x: number;
  readonly y: number;
  readonly revision: number;
  readonly bytes: Uint8ClampedArray<ArrayBuffer>;
}

export interface CanvasFrameViewModel {
  readonly document: DocumentDescriptor;
  readonly tileSize: number;
  readonly tiles: readonly CanvasTileViewModel[];
}
