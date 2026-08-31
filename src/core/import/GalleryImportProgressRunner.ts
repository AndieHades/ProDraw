import type { GalleryImportStage } from "../../config/import-progress.ts";

export interface GalleryImportProgress {
  ready?(): Promise<void>;
  stage(value: GalleryImportStage): void;
  finish(success: boolean): void;
}

export type BeginGalleryImportProgress = (
  fileName: string,
) => GalleryImportProgress;

export async function runGalleryImportProgress<T>(
  fileName: string,
  beginProgress: BeginGalleryImportProgress,
  operation: (progress: GalleryImportProgress) => T | Promise<T>,
): Promise<T> {
  const progress = beginProgress(fileName);
  try {
    await progress.ready?.();
    const result = await operation(progress);
    progress.finish(result !== false);
    return result;
  } catch (error) {
    progress.finish(false);
    throw error;
  }
}
