import type { DocumentSessionSnapshot } from "../contracts/persistence";
import { DEFAULT_DOCUMENT } from "../config/raster";
import { createRasterDocument } from "../core/document/createRasterDocument";
import type { RasterDocument } from "../core/document/RasterDocument";
import type { DocumentRepository } from "../core/persistence/DocumentRepository";
import { restoreDocument } from "../core/persistence/documentSerialization";
import { t } from "../i18n/raster/translate";

export interface InitialEditorState {
  readonly document: RasterDocument;
  readonly session: DocumentSessionSnapshot;
  readonly recoveryStatus: "empty" | "current" | "previous" | "corrupt";
}

const blankSession = (): DocumentSessionSnapshot => ({
  revision: 0, savedRevision: 0, nativeLocation: null
});

function blank(status: InitialEditorState["recoveryStatus"]): InitialEditorState {
  return { document: createRasterDocument({ ...DEFAULT_DOCUMENT,
    name: t("new.untitled"), layerName: t("layers.default") }),
    session: blankSession(), recoveryStatus: status };
}

export async function createInitialDocument(
  repository: DocumentRepository
): Promise<InitialEditorState> {
  try {
    const recovered = await repository.loadRecovery();
    if (recovered.document && recovered.session) {
      return { document: restoreDocument(recovered.document), session: recovered.session,
        recoveryStatus: recovered.status === "previous" ? "previous" : "current" };
    }
    return blank(recovered.status === "corrupt" ? "corrupt" : "empty");
  } catch {
    return blank("corrupt");
  }
}
