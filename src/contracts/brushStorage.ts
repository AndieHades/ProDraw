export interface BrushSeedFile {
  readonly fileName: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
}

export interface BrushStoredFile {
  readonly fileName: string;
  readonly byteLength: number;
  readonly modifiedAt: number;
}

export interface BrushStoredSet {
  readonly name: string;
  readonly seeded: boolean;
  readonly files: readonly BrushStoredFile[];
}

export interface BrushLibraryStoragePort {
  ensureSeeded(setName: string, files: readonly BrushSeedFile[]): Promise<void>;
  listSets(): Promise<readonly BrushStoredSet[]>;
  readFile(setName: string, fileName: string): Promise<Uint8Array<ArrayBuffer>>;
  writeFile(setName: string, fileName: string, bytes: Uint8Array<ArrayBuffer>): Promise<void>;
  trashFile(setName: string, fileName: string): Promise<void>;
  createSet(setName: string): Promise<void>;
  renameSet(from: string, to: string): Promise<void>;
  moveFile(fromSet: string, toSet: string, fileName: string): Promise<void>;
}

export interface DesktopBrushStorageBridge {
  ensureSeeded(setName: string, files: readonly { fileName: string; bytes: ArrayBuffer }[]): Promise<void>;
  listSets(): Promise<readonly BrushStoredSet[]>;
  readFile(setName: string, fileName: string): Promise<ArrayBuffer>;
  writeFile(setName: string, fileName: string, bytes: ArrayBuffer): Promise<void>;
  trashFile(setName: string, fileName: string): Promise<void>;
  createSet(setName: string): Promise<void>;
  renameSet(from: string, to: string): Promise<void>;
  moveFile(fromSet: string, toSet: string, fileName: string): Promise<void>;
}
