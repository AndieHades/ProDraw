import type { BrushPreset } from "../../contracts/brush";
import type { EditorViewModel } from "../../contracts/editorView";
import type { DocumentSessionSnapshot } from "../../contracts/persistence";
import type { ViewState } from "../../contracts/view";
import type { RasterDocument } from "../document/RasterDocument";
import type { TileHistory } from "../history/TileHistory";

export function createEditorView(
  document: RasterDocument,
  history: TileHistory,
  view: ViewState,
  brush: BrushPreset,
  session: DocumentSessionSnapshot
): EditorViewModel {
  const snapshot = document.snapshot();
  return {
    document: { ...document.descriptor },
    history: { undoCount: history.undoCount, redoCount: history.redoCount },
    layers: { activeLayerId: snapshot.activeLayerId,
      layers: snapshot.layers.map((layer) => ({ ...layer })) },
    view: { ...view },
    brushName: brush.name,
    session: { revision: session.revision, savedRevision: session.savedRevision,
      dirty: session.revision !== session.savedRevision,
      hasNativeLocation: session.nativeLocation !== null }
  };
}
