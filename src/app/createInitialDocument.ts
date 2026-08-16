import { DEFAULT_DOCUMENT } from "../config/raster";
import { createRasterDocument } from "../core/document/createRasterDocument";
import type { RasterDocument } from "../core/document/RasterDocument";
import type { DocumentRepository } from "../core/persistence/DocumentRepository";
import { restoreDocument } from "../core/persistence/documentSerialization";
import { t } from "../i18n/raster/translate";

export async function createInitialDocument(
  repository: DocumentRepository
): Promise<RasterDocument> {
  try {
    const saved = await repository.loadCurrent();
    if (saved) return restoreDocument(saved);
  } catch {
    // A corrupt autosave must not prevent the editor from starting.
  }
  return createRasterDocument({ ...DEFAULT_DOCUMENT,
    name: t("new.untitled"), layerName: t("layers.default") });
}
