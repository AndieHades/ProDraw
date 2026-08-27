export interface ExportTreeSession {
  readonly token: string;
  readonly parent: string;
  readonly staging: string;
  readonly rootName: string;
}

export function safeExportSegment(value: unknown, fallback?: string): string;
export function exportTreeTarget(session: ExportTreeSession,
  requestedPath: readonly string[]): string;
export function exportTreeDirectoryTarget(session: ExportTreeSession,
  requestedPath: readonly string[]): string;
export function createExportTreeSession(parent: string,
  suggestedName: string): Promise<ExportTreeSession>;
export function writeExportTreeFile(session: ExportTreeSession,
  requestedPath: readonly string[], bytes: ArrayBufferView | ArrayBuffer): Promise<void>;
export function ensureExportTreeDirectory(session: ExportTreeSession,
  requestedPath: readonly string[]): Promise<void>;
export function commitExportTree(session: ExportTreeSession): Promise<{
  readonly name: string;
  readonly location: string;
}>;
export function abortExportTree(session: ExportTreeSession): Promise<void>;
