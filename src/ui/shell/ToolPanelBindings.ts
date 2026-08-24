import { showMenuForAnchor } from "../dom/AnchoredMenuPresenter.ts";

export interface ToolPanelCallbacks {
  readonly adjust: () => void;
  readonly brush: (tool: "eraser" | "pencil") => void;
  readonly center: () => void;
  readonly fill: () => void;
  readonly flip: () => void;
  readonly imageSettings: () => void;
  readonly lasso: () => void;
  readonly move: () => void;
  readonly select: () => void;
  readonly shape: () => void;
  readonly showModes: () => void;
  readonly symmetry: () => void;
  readonly zoom: () => void;
}

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing tool-panel element: ${id}`);
  return found as T;
};

function bindChoiceMenu(buttonId: string, menuId: string, beforeOpen: () => void): void {
  element(buttonId).addEventListener("contextmenu", (event) => {
    event.preventDefault(); beforeOpen();
    showMenuForAnchor(element(menuId), element(buttonId));
  });
}

export function bindToolPanelButtons(callbacks: ToolPanelCallbacks): void {
  element<HTMLButtonElement>("t-pencil").onclick = () => callbacks.brush("pencil");
  element<HTMLButtonElement>("t-eraser").onclick = () => callbacks.brush("eraser");
  element<HTMLButtonElement>("t-shape").onclick = callbacks.shape;
  bindChoiceMenu("t-shape", "shape-choice", callbacks.showModes);
  element<HTMLButtonElement>("t-move").onclick = callbacks.move;
  element<HTMLButtonElement>("t-select").onclick = callbacks.select;
  element<HTMLButtonElement>("t-lasso").onclick = callbacks.lasso;
  element<HTMLButtonElement>("t-fill").onclick = callbacks.fill;
  element<HTMLButtonElement>("t-adjust").onclick = callbacks.adjust;
  element("t-adjust").addEventListener("contextmenu", (event) => {
    event.preventDefault(); callbacks.adjust(); element("adjpop").classList.add("on");
  });
  element<HTMLButtonElement>("sym").onclick = callbacks.symmetry;
  bindChoiceMenu("sym", "sym-choice", callbacks.showModes);
  element<HTMLButtonElement>("flip-h").onclick = callbacks.flip;
  bindChoiceMenu("flip-h", "flip-choice", callbacks.showModes);
  element<HTMLButtonElement>("img-settings").onclick = callbacks.imageSettings;
  element<HTMLButtonElement>("center").onclick = callbacks.center;
  bindChoiceMenu("center", "center-choice", callbacks.showModes);
  element<HTMLButtonElement>("zoom").onclick = callbacks.zoom;
  bindChoiceMenu("zoom", "zoom-choice", callbacks.showModes);
}
