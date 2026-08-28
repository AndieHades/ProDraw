export const GALLERY_IMPORT_PROGRESS_DELAY_MS = 2_000;
export const GALLERY_IMPORT_UI_COMMIT_TIMEOUT_MS = 50;

export const GALLERY_IMPORT_STAGE_PERCENT = {
  checking: 0,
  decoding: 20,
  preparing: 40,
  saving: 60,
  opening: 80,
  complete: 100,
} as const;

export type GalleryImportStage = keyof typeof GALLERY_IMPORT_STAGE_PERCENT;
