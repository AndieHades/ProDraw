import type { EditorCommandDispatch } from "../../contracts/editorCommands";
import type { EditorViewModel } from "../../contracts/editorView";
import type { RgbaColor } from "../../contracts/raster";
import type { DrawingTool } from "../../contracts/stroke";
import { applyTranslations, t, type MessageKey } from "../../i18n/raster/translate";
import { requiredElement, setSelected } from "../dom/query";
import { FloatingToolPanelPresenter } from "./FloatingToolPanelPresenter";

export class WorkspacePresenter {
  readonly canvas = requiredElement<HTMLCanvasElement>("#paint-canvas");
  readonly #size = requiredElement<HTMLInputElement>("#brush-size");
  readonly #opacity = requiredElement<HTMLInputElement>("#brush-opacity");
  readonly #color = requiredElement<HTMLInputElement>("#brush-color");
  readonly #brushName = requiredElement<HTMLSpanElement>("#active-brush-name");
  readonly #documentStatus = requiredElement<HTMLSpanElement>("#document-status");
  readonly #viewStatus = requiredElement<HTMLSpanElement>("#view-status");
  readonly #toast = requiredElement<HTMLDivElement>("#toast");
  #tool: DrawingTool = "brush";
  #toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    applyTranslations();
    new FloatingToolPanelPresenter();
    this.syncBrushControls();
    this.#size.addEventListener("input", () => this.syncBrushControls());
    this.#opacity.addEventListener("input", () => this.syncBrushControls());
  }

  bind(dispatch: EditorCommandDispatch): void {
    this.click("#new-document", () => dispatch({ type: "document.new" }));
    this.click("#open-document", () => dispatch({ type: "document.open" }));
    this.click("#save-document", () => dispatch({ type: "document.save" }));
    this.click("#save-document-as", () => dispatch({ type: "document.saveAs" }));
    this.click("#export-png", () => dispatch({ type: "document.exportPng" }));
    this.click("#undo", () => dispatch({ type: "history.undo" }));
    this.click("#redo", () => dispatch({ type: "history.redo" }));
    this.click("#view-fit", () => dispatch({ type: "view.fit" }));
    this.click("#view-rotate-left", () => dispatch({ type: "view.rotate", direction: -1 }));
    this.click("#view-rotate-right", () => dispatch({ type: "view.rotate", direction: 1 }));
    this.click("#open-brushes", () => dispatch({ type: "brush.library.open" }));
    this.click("#add-layer", () => dispatch({ type: "layer.add" }));
    this.click("#tool-brush", () => dispatch({ type: "tool.select", tool: "brush" }));
    this.click("#tool-smudge", () => dispatch({ type: "tool.select", tool: "smudge" }));
    this.click("#tool-eraser", () => dispatch({ type: "tool.select", tool: "eraser" }));
  }

  get brushSize(): number {
    return Number(this.#size.value);
  }

  get brushOpacity(): number {
    return Number(this.#opacity.value) / 100;
  }

  get color(): RgbaColor {
    const value = this.#color.value;
    return { red: Number.parseInt(value.slice(1, 3), 16),
      green: Number.parseInt(value.slice(3, 5), 16),
      blue: Number.parseInt(value.slice(5, 7), 16), alpha: 255 };
  }

  get tool(): DrawingTool {
    return this.#tool;
  }

  setTool(tool: DrawingTool): void {
    this.#tool = tool;
    setSelected(requiredElement("#tool-brush"), tool === "brush");
    setSelected(requiredElement("#tool-smudge"), tool === "smudge");
    setSelected(requiredElement("#tool-eraser"), tool === "eraser");
    requiredElement("#brush-opacity-label").textContent =
      t(tool === "smudge" ? "smudge.strength" : "brush.opacity");
  }

  render(model: EditorViewModel): void {
    const descriptor = model.document;
    this.#brushName.textContent = model.brushName;
    const dirty = model.session.dirty ? "*" : "";
    this.#documentStatus.textContent = `${descriptor.name}${dirty} · ${descriptor.width} × ` +
      `${descriptor.height} px · ${descriptor.dpi} DPI`;
    const degrees = Math.round(model.view.rotation * 180 / Math.PI);
    this.#viewStatus.textContent = `${Math.round(model.view.scale * 100)}% · ${degrees}°`;
    requiredElement<HTMLButtonElement>("#undo").disabled = model.history.undoCount === 0;
    requiredElement<HTMLButtonElement>("#redo").disabled = model.history.redoCount === 0;
  }

  showStatus(key: MessageKey): void {
    this.#documentStatus.textContent = t(key);
    this.#toast.textContent = t(key);
    this.#toast.classList.add("visible");
    if (this.#toastTimer) clearTimeout(this.#toastTimer);
    this.#toastTimer = setTimeout(() => this.#toast.classList.remove("visible"), 1600);
  }

  private click(selector: string, action: () => void): void {
    requiredElement<HTMLButtonElement>(selector).addEventListener("click", action);
  }

  private syncBrushControls(): void {
    requiredElement<HTMLOutputElement>("#brush-size-value").textContent = `${this.brushSize} px`;
    requiredElement<HTMLOutputElement>("#brush-opacity-value").textContent =
      `${Math.round(this.brushOpacity * 100)}%`;
  }
}
