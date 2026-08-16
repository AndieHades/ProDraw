export type PlatformKind = "web" | "windows";

export interface FileFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface OpenedBinaryFile {
  readonly name: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
}

export interface SaveBinaryRequest {
  readonly suggestedName: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly filters?: readonly FileFilter[];
}

export interface PlatformPort {
  readonly kind: PlatformKind;
  openBinary(filters?: readonly FileFilter[]): Promise<OpenedBinaryFile | null>;
  saveBinary(request: SaveBinaryRequest): Promise<boolean>;
}

export interface DesktopBridge {
  readonly platform: "windows";
  openBinary(filters?: readonly FileFilter[]): Promise<{
    readonly name: string;
    readonly bytes: ArrayBuffer;
  } | null>;
  saveBinary(request: {
    readonly suggestedName: string;
    readonly bytes: ArrayBuffer;
    readonly filters?: readonly FileFilter[];
  }): Promise<boolean>;
}
