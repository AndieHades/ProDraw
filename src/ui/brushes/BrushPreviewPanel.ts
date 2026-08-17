import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { t } from "../../i18n/raster/translate";
import { renderBrushPreview } from "./renderBrushPreview";

export function brushPreviewPanel(brush: BrushPreset | LoadedBrush): HTMLElement {
  const section = document.createElement("section");
  section.className = "studio-preview-panel";
  const title = document.createElement("strong"); title.textContent = t("studio.preview");
  const canvas = document.createElement("canvas");
  canvas.className = "studio-preview-render"; renderBrushPreview(canvas, brush);
  const hint = document.createElement("p"); hint.textContent = t("studio.previewHint");
  section.append(title, canvas, hint); return section;
}
