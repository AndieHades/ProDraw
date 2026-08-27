import type {
  BrushLibraryStoragePort, DesktopBrushStorageBridge
} from "./brushStorage";
import type { BrushLibraryStatePort } from "./brushStorage";
import type { BrushDecoderPort } from "./brushDecoder";

export type PlatformKind = "web" | "windows";

export interface FileFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface OpenedBinaryFile {
  readonly name: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly location: string | null;
}

export interface SavedBinaryFile {
  readonly name: string;
  readonly location: string | null;
}

export interface SaveBinaryRequest {
  readonly suggestedName: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly filters?: readonly FileFilter[];
}

export interface ConfirmDiscardRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
}

export interface DesktopFileTreeBridge {
  begin(suggestedName: string): Promise<{ readonly token: string } | null>;
  ensureDirectory(token: string, relativePath: readonly string[]): Promise<boolean>;
  write(token: string, relativePath: readonly string[], bytes: ArrayBuffer): Promise<boolean>;
  commit(token: string): Promise<{ readonly name: string; readonly location: string }>;
  abort(token: string): Promise<boolean>;
}

export interface PlatformPort {
  readonly kind: PlatformKind;
  readonly brushStorage: BrushLibraryStoragePort | null;
  readonly brushStateStorage?: BrushLibraryStatePort;
  readonly brushDecoder: BrushDecoderPort;
  openBinary(filters?: readonly FileFilter[]): Promise<OpenedBinaryFile | null>;
  saveBinary(request: SaveBinaryRequest): Promise<SavedBinaryFile | null>;
  writeBinary(location: string, bytes: Uint8Array<ArrayBuffer>): Promise<boolean>;
  confirmDiscard(request: ConfirmDiscardRequest): Promise<boolean>;
  onCloseRequested(handler: () => Promise<boolean>): () => void;
}

export interface DesktopBridge {
  readonly platform: "windows";
  readonly brushStorage: DesktopBrushStorageBridge;
  readonly fileTree: DesktopFileTreeBridge;
  fileLocation(file: unknown): string | null;
  openBinary(filters?: readonly FileFilter[]): Promise<{
    readonly name: string;
    readonly bytes: ArrayBuffer;
    readonly location: string;
  } | null>;
  saveBinary(request: {
    readonly suggestedName: string;
    readonly bytes: ArrayBuffer;
    readonly filters?: readonly FileFilter[];
  }): Promise<{ readonly name: string; readonly location: string } | null>;
  writeBinary(location: string, bytes: ArrayBuffer): Promise<boolean>;
  confirmDiscard(request: ConfirmDiscardRequest): Promise<boolean>;
  onCloseRequested(listener: () => void): () => void;
  resolveCloseRequest(allow: boolean): void;
}
