export interface SourceFileState { readonly sourceFormat?: string | null;
  readonly sourceLocation?: string | null }
export interface SourceEncodedOutput { readonly blob: Blob | null | undefined }
export interface SourceFileSaveOptions {
  readonly state: SourceFileState;
  readonly format: string;
  readonly extension: RegExp;
  readonly encode: () => Promise<SourceEncodedOutput>;
  readonly write: ((location: string, bytes: Uint8Array<ArrayBuffer>) =>
    Promise<boolean>) | null | undefined;
}
export function writableSourceLocation(state: SourceFileState, format: string,
  extension: RegExp): string | null {
  const location = state.sourceLocation ?? null;
  return state.sourceFormat === format && location && extension.test(location) ? location : null;
}
export function createSourceFileSaver(options: SourceFileSaveOptions): () => Promise<boolean> {
  return async () => {
    const location = writableSourceLocation(options.state, options.format, options.extension);
    if (!location || !options.write) return false;
    try {
      const output = await options.encode(); if (!output.blob) return false;
      const bytes = new Uint8Array(await output.blob.arrayBuffer());
      return Boolean(await options.write(location, bytes));
    } catch { return false; }
  };
}
