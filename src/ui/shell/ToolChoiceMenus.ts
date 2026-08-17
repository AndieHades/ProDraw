import {
  BRUSH_MODES, CENTER_MODES, FLIP_MODES, ICONS, LINE_MODES, SHAPE_MODES,
  SYM_MODES, SYM_TOOLS, ZOOM_MODES
} from "../../config/toolbar.ts";
import { t } from "../../i18n/index.ts";
import type { ShellActionName } from "../../contracts/shellActionCatalog.ts";
import type { ShapeChoice, SymmetryFlag } from "./ToolPanelTypes.ts";

export interface ToolChoiceCallbacks {
  readonly action: (group: "center" | "flip" | "zoom", mode: string,
    action: ShellActionName) => void;
  readonly brush: (mode: string) => void;
  readonly shape: (mode: ShapeChoice) => void;
  readonly symmetryFlag: (flag: SymmetryFlag) => void;
  readonly symmetryTool: (mode: string) => void;
}

function menu(id: string): HTMLElement | null { return document.getElementById(id); }
function choiceButton(icon: keyof typeof ICONS, key: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.innerHTML = ICONS[icon]; button.title = t(key); button.dataset.i18nTitle = key;
  return button;
}

export function buildToolChoices(callbacks: ToolChoiceCallbacks): void {
  const brush = menu("brush-choice");
  if (brush && !brush.dataset.ready) {
    brush.dataset.ready = "1";
    for (const mode of BRUSH_MODES) {
      const button = choiceButton(mode.icon, mode.key); button.dataset.brushMode = mode.mode;
      button.onclick = () => { brush.classList.remove("on"); callbacks.brush(mode.mode); };
      brush.appendChild(button);
    }
  }
  const shape = menu("shape-choice");
  if (shape && !shape.dataset.ready) {
    shape.dataset.ready = "1";
    for (const mode of LINE_MODES) {
      const button = choiceButton(mode.icon, mode.key); button.dataset.lineMode = mode.mode;
      button.onclick = () => { shape.classList.remove("on");
        callbacks.shape({ kind: "line", mode: mode.mode }); };
      shape.appendChild(button);
    }
    for (const mode of SHAPE_MODES) {
      const button = choiceButton(mode.icon, mode.key); button.dataset.shapeTool = mode.tool;
      button.dataset.fill = mode.fill ? "1" : "0";
      button.onclick = () => { shape.classList.remove("on");
        callbacks.shape({ kind: "shape", tool: mode.tool, fill: mode.fill }); };
      shape.appendChild(button);
    }
  }
  const symmetry = menu("sym-choice");
  if (symmetry && !symmetry.dataset.ready) {
    symmetry.dataset.ready = "1";
    for (const mode of SYM_MODES) {
      const button = choiceButton(mode.icon, mode.key); button.dataset.symFlag = mode.flag;
      button.onclick = () => callbacks.symmetryFlag(mode.flag);
      symmetry.appendChild(button);
    }
  }
  if (symmetry && !symmetry.dataset.toolsReady) {
    symmetry.dataset.toolsReady = "1";
    for (const mode of SYM_TOOLS) {
      const button = choiceButton(mode.icon, mode.key); button.dataset.symTool = mode.mode;
      button.onclick = () => callbacks.symmetryTool(mode.mode);
      symmetry.appendChild(button);
    }
  }
  buildActionChoices("flip-choice", "flip", FLIP_MODES, callbacks);
  buildActionChoices("center-choice", "center", CENTER_MODES, callbacks);
  buildActionChoices("zoom-choice", "zoom", ZOOM_MODES, callbacks);
}

function buildActionChoices(
  id: string, group: "center" | "flip" | "zoom",
  modes: readonly { readonly action: ShellActionName; readonly icon: keyof typeof ICONS;
    readonly key: string; readonly mode: string }[], callbacks: ToolChoiceCallbacks
): void {
  const element = menu(id);
  if (!element || element.dataset.ready) return;
  element.dataset.ready = "1";
  for (const mode of modes) {
    const button = choiceButton(mode.icon, mode.key);
    button.dataset[`${group}Mode`] = mode.mode;
    button.onclick = () => callbacks.action(group, mode.mode, mode.action);
    element.appendChild(button);
  }
}
