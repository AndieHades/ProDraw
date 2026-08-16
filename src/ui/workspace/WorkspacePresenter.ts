import type { RgbaColor } from "../../contracts/raster";
import type { ViewState } from "../../contracts/view";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { TileHistory } from "../../core/history/TileHistory";
import { applyTranslations, t, type MessageKey } from "../../i18n/raster/translate";
import { requiredElement, setSelected } from "../dom/query";

export interface WorkspaceActions {
  readonly newDocument: () => void;
  readonly exportPng: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly selectTool: (tool: "brush" | "eraser") => void;
  readonly fitView: () => void;
  readonly rotateView: (direction: -1 | 1) => void;
  readonly openBrushes: () => void;
  readonly addLayer: () => void;
}

export class WorkspacePresenter {
  readonly canvas = requiredElement<HTMLCanvasElement>("#paint-canvas");
  readonly #size = requiredElement<HTMLInputElement>("#brush-size");
  readonly #opacity = requiredElement<HTMLInputElement>("#brush-opacity");
  readonly #color = requiredElement<HTMLInputElement>("#brush-color");
  readonly #brushName = requiredElement<HTMLSpanElement>("#active-brush-name");
  readonly #documentStatus = requiredElement<HTMLSpanElement>("#document-status");
  readonly #viewStatus = requiredElement<HTMLSpanElement>("#view-status");
  readonly #toast = requiredElement<HTMLDivElement>("#toast");
  #tool: "brush" | "eraser" = "brush";
  #toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    applyTranslations();
    this.syncBrushControls();
    this.#size.addEventListener("input", () => this.syncBrushControls());
    this.#opacity.addEventListener("input", () => this.syncBrushControls());
  }

  bind(actions: WorkspaceActions): void {
    this.click("#new-document", actions.newDocument);
    this.click("#export-png", actions.exportPng);
    this.click("#undo", actions.undo);
    this.click("#redo", actions.redo);
    this.click("#view-fit", actions.fitView);
    this.click("#view-rotate-left", () => actions.rotateView(-1));
    this.click("#view-rotate-right", () => actions.rotateView(1));
    this.click("#open-brushes", actions.openBrushes);
    this.click("#add-layer", actions.addLayer);
    this.click("#tool-brush", () => actions.selectTool("brush"));
    this.click("#tool-eraser", () => actions.selectTool("eraser"));
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

  get tool(): "brush" | "eraser" {
    return this.#tool;
  }

  setTool(tool: "brush" | "eraser"): void {
    this.#tool = tool;
    setSelected(requiredElement("#tool-brush"), tool === "brush");
    setSelected(requiredElement("#tool-eraser"), tool === "eraser");
  }

  setBrushName(name: string): void {
    this.#brushName.textContent = name;
  }

  updateDocument(document: RasterDocument): void {
    const descriptor = document.descriptor;
    this.#documentStatus.textContent = `${descriptor.name} · ${descriptor.width} × ` +
      `${descriptor.height} px · ${descriptor.dpi} DPI`;
  }

  updateView(view: ViewState): void {
    const degrees = Math.round(view.rotation * 180 / Math.PI);
    this.#viewStatus.textContent = `${Math.round(view.scale * 100)}% · ${degrees}°`;
  }

  updateHistory(history: TileHistory): void {
    requiredElement<HTMLButtonElement>("#undo").disabled = history.undoCount === 0;
    requiredElement<HTMLButtonElement>("#redo").disabled = history.redoCount === 0;
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
