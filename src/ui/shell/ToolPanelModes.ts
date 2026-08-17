import {
  BRUSH_MODES, CENTER_MODES, FLIP_MODES, ICONS, LINE_MODES, SHAPE_MODES,
  SYM_MODES, SYM_TOOLS, ZOOM_MODES
} from "../../config/toolbar.ts";
import { t } from "../../i18n/index.ts";
import type { ShapeChoice, SymmetryFlag, ToolPanelState } from "./ToolPanelTypes.ts";

type IconMode = { readonly icon: keyof typeof ICONS; readonly key: string };
type SymChoice = { readonly flag: SymmetryFlag; readonly kind: "flag" } |
  { readonly kind: "tool"; readonly mode: string };

const element = (id: string): HTMLElement | null => document.getElementById(id);
function setButtonIcon(button: HTMLElement | null, mode: IconMode): void {
  if (!button) return;
  button.innerHTML = ICONS[mode.icon];
  button.dataset.i18nTitle = mode.key;
  button.title = t(mode.key);
}

export class ToolPanelModes {
  brush = "normal";
  shape: ShapeChoice = { kind: "shape", tool: "rect", fill: false };
  symmetry: SymChoice = { kind: "flag", flag: "sym" };
  flip = "h";
  center = "center";
  zoom = "fit";

  brushConfig(state: ToolPanelState): IconMode {
    const mode = state.tool === "pencil" && state.shadingActive ? "shading" : this.brush;
    return BRUSH_MODES.find((item) => item.mode === mode) ?? BRUSH_MODES[0];
  }
  shapeConfig(): IconMode {
    const shape = this.shape;
    if (shape.kind === "line") {
      return LINE_MODES.find((item) => item.mode === shape.mode) ?? LINE_MODES[0];
    }
    return SHAPE_MODES.find((item) => item.tool === shape.tool &&
      item.fill === shape.fill) ?? SHAPE_MODES[0];
  }
  symmetryConfig(): IconMode {
    const symmetry = this.symmetry;
    if (symmetry.kind === "tool") {
      return SYM_TOOLS.find((item) => item.mode === symmetry.mode) ??
        { icon: "symV", key: "side.symmetry" };
    }
    return SYM_MODES.find((item) => item.flag === symmetry.flag) ??
      { icon: "symV", key: "side.symmetry" };
  }
  flipConfig() { return FLIP_MODES.find((item) => item.mode === this.flip) ?? FLIP_MODES[0]; }
  centerConfig() { return CENTER_MODES.find((item) => item.mode === this.center) ?? CENTER_MODES[0]; }
  zoomConfig() { return ZOOM_MODES.find((item) => item.mode === this.zoom) ?? ZOOM_MODES[0]; }

  updateShapeFrom(state: ToolPanelState): void {
    if (state.tool === "line") this.shape = { kind: "line", mode: state.lineMode || "line" };
    else if (state.tool === "rect" || state.tool === "ellipse") {
      this.shape = { kind: "shape", tool: state.tool, fill: Boolean(state.fillShape[state.tool]) };
    }
  }

  symmetryActive(state: ToolPanelState): boolean {
    return state.symEnabled && (Object.values(state.symFlags).some(Boolean) ||
      state.symLineMode !== null);
  }

  sync(state: ToolPanelState): void {
    setButtonIcon(element("t-pencil"), this.brushConfig(state));
    setButtonIcon(element("t-shape"), this.shapeConfig());
    setButtonIcon(element("sym"), this.symmetryConfig());
    setButtonIcon(element("flip-h"), this.flipConfig());
    setButtonIcon(element("center"), this.centerConfig());
    setButtonIcon(element("zoom"), this.zoomConfig());
    element("sym")?.classList.toggle("on", this.symmetryActive(state));
    this.syncChoices(state);
  }

  private syncChoices(state: ToolPanelState): void {
    element("brush-choice")?.querySelectorAll<HTMLElement>("button").forEach((button) =>
      button.classList.toggle("on", button.dataset.brushMode === this.brush));
    element("shape-choice")?.querySelectorAll<HTMLElement>("button").forEach((button) => {
      if (button.dataset.lineMode) button.classList.toggle("on",
        this.shape.kind === "line" && button.dataset.lineMode === this.shape.mode);
      if (button.dataset.shapeTool) button.classList.toggle("on", this.shape.kind === "shape" &&
        button.dataset.shapeTool === this.shape.tool &&
        (button.dataset.fill === "1") === this.shape.fill);
    });
    element("sym-choice")?.querySelectorAll<HTMLElement>("button").forEach((button) => {
      const flag = button.dataset.symFlag as SymmetryFlag | undefined;
      if (flag) button.classList.toggle("on", state.symFlags[flag]);
      if (button.dataset.symTool) button.classList.toggle("on",
        state.symLineMode === button.dataset.symTool);
    });
    for (const [id, field] of [["flip-choice", this.flip], ["center-choice", this.center],
      ["zoom-choice", this.zoom]] as const) {
      element(id)?.querySelectorAll<HTMLElement>("button").forEach((button) =>
        button.classList.toggle("on", Object.values(button.dataset).includes(field)));
    }
  }
}
