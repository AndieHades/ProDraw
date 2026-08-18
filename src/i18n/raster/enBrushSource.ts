import type { ruBrushSource } from "./ruBrushSource";

export const enBrushSource: Record<keyof typeof ruBrushSource, string> = {
  "action.edit": "Edit",
  "brush.import": "Import brush",
  "brush.export": "Export selected brush",
  "brush.reset": "Reset brush settings from the source archive",
  "brush.restoreTrash": "Restore brushes and sets from Trash",
  "brush.revealFolder": "Reveal the set folder in File Explorer",
  "brush.fileFilter": "Procreate or ProDraw Brush",
  "source.library": "Source Library",
  "source.shape": "Shape Source",
  "source.grain": "Grain Source",
  "source.loading": "Loading brush resources…",
  "source.noneForKind": "No live brush contains this resource type.",
  "source.state.embedded": "Embedded source",
  "source.state.resolved": "Library source",
  "source.state.missing": "Missing source",
  "status.brushImported": "Brush imported",
  "status.brushExported": "Brush exported",
  "status.brushReset": "Brush settings reset",
  "status.brushTrashRestored": "Available brushes restored from Trash",
  "status.brushFileFailed": "Brush file operation failed"
};
