import type { DesktopBridge } from "../contracts/platform";

// File System Access is still absent from the DOM lib shipped with TypeScript,
// and only the parts the editor actually calls are declared here.
export interface SaveFilePickerType {
  readonly description?: string;
  readonly accept: Record<string, readonly string[]>;
}

export interface SaveFilePickerOptions {
  readonly suggestedName?: string;
  readonly types?: readonly SaveFilePickerType[];
}

export interface WritableFile {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}

export interface SaveFileHandle {
  readonly name: string;
  createWritable(): Promise<WritableFile>;
}

declare global {
  interface Window {
    prodrawDesktop?: DesktopBridge;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<SaveFileHandle>;
  }
}

export {};
