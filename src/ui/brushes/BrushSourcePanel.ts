import type { BrushPreset, BrushSourceKind, LoadedBrush } from "../../contracts/brush";
import { t } from "../../i18n/raster/translate";
import { renderCoverageMap } from "./renderCoverageMap";

export function brushSourcePanel(preset: BrushPreset | LoadedBrush,
  kind: BrushSourceKind, editSource: (kind: BrushSourceKind) => void): HTMLElement {
  const section = document.createElement("section");
  section.className = "studio-source";
  const header = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = t(kind === "shape" ? "source.shape" : "source.grain");
  const edit = document.createElement("button");
  edit.type = "button"; edit.textContent = t("action.edit");
  edit.addEventListener("click", () => editSource(kind));
  const canvas = document.createElement("canvas");
  const map = "shapeMap" in preset
    ? (kind === "shape" ? preset.shapeMap : preset.grainMap) : null;
  renderCoverageMap(canvas, map);
  const source = preset.sources[kind]?.sourceBrushName ?? preset[kind].sourceName ?? "—";
  const caption = document.createElement("span");
  caption.className = "studio-source-name"; caption.textContent = source;
  const state = document.createElement("span");
  state.className = "studio-source-state";
  if ("compatibility" in preset) {
    const sourceState = kind === "shape" ? preset.compatibility.shapeSourceState :
      preset.compatibility.grainSourceState;
    state.textContent = t(`source.state.${sourceState}`);
  }
  header.append(title, edit); section.append(header, canvas, caption, state); return section;
}
