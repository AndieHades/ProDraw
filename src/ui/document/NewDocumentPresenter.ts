import type { CanvasPreset } from "../../contracts/canvasPreset";
import type { EditorCommandDispatch } from "../../contracts/editorCommands";
import { CANVAS_PRESETS, validateCanvasSize } from "../../config/canvasPresets";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";

export class NewDocumentPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#new-document-dialog");
  readonly #width = requiredElement<HTMLInputElement>("#custom-width");
  readonly #height = requiredElement<HTMLInputElement>("#custom-height");
  readonly #dpi = requiredElement<HTMLInputElement>("#custom-dpi");
  readonly #error = requiredElement<HTMLParagraphElement>("#new-error");
  readonly #dispatch: EditorCommandDispatch;

  constructor(dispatch: EditorCommandDispatch) {
    this.#dispatch = dispatch;
    this.renderPresets();
    requiredElement<HTMLButtonElement>("#create-document")
      .addEventListener("click", this.onCreate);
  }

  open(): void {
    this.#error.textContent = "";
    this.#dialog.showModal();
  }

  private renderPresets(): void {
    const host = requiredElement<HTMLDivElement>("#preset-list");
    host.replaceChildren(...CANVAS_PRESETS.map((preset) => this.presetButton(preset)));
  }

  private presetButton(preset: CanvasPreset): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    const name = document.createElement("strong");
    name.textContent = preset.label;
    const details = document.createElement("small");
    details.textContent = `${preset.width} × ${preset.height} · ${preset.dpi} DPI`;
    button.append(name, details);
    button.addEventListener("click", () => {
      this.#width.value = String(preset.width);
      this.#height.value = String(preset.height);
      this.#dpi.value = String(preset.dpi);
    });
    return button;
  }

  private readonly onCreate = (event: MouseEvent): void => {
    event.preventDefault();
    const width = Number(this.#width.value);
    const height = Number(this.#height.value);
    const dpi = Number(this.#dpi.value);
    const validation = validateCanvasSize(width, height);
    if (!validation.valid || !Number.isInteger(dpi) || dpi < 1 || dpi > 1200) {
      this.#error.textContent = t(validation.reason === "pixels"
        ? "new.invalidPixels" : "new.invalidSide");
      return;
    }
    this.#dialog.close();
    this.#dispatch({ type: "document.create",
      request: { name: t("new.untitled"), width, height, dpi } });
  };
}
