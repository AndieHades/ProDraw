import type { BrushPreset } from "../../contracts/brush";
import { requiredElement } from "../dom/query";
import { renderBrushPreview } from "./renderBrushPreview";

export class BrushLibraryPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-library-dialog");
  readonly #list = requiredElement<HTMLDivElement>("#brush-list");
  readonly #presets: readonly BrushPreset[];
  readonly #onSelect: (brush: BrushPreset) => void;
  #selectedId: string;

  constructor(
    presets: readonly BrushPreset[],
    selectedId: string,
    onSelect: (brush: BrushPreset) => void
  ) {
    this.#presets = presets;
    this.#selectedId = selectedId;
    this.#onSelect = onSelect;
    this.render();
  }

  open(): void {
    this.#dialog.showModal();
  }

  select(id: string): void {
    this.#selectedId = id;
    this.render();
  }

  private render(): void {
    this.#list.replaceChildren(...this.#presets.map((brush) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `brush-row${brush.id === this.#selectedId ? " selected" : ""}`;
      button.dataset.brushId = brush.id;
      const name = document.createElement("span");
      name.textContent = brush.name;
      const preview = document.createElement("canvas");
      preview.className = "brush-preview";
      renderBrushPreview(preview, brush);
      button.append(name, preview);
      button.addEventListener("click", () => {
        this.#selectedId = brush.id;
        this.#onSelect(brush);
        this.#dialog.close();
        this.render();
      });
      return button;
    }));
  }
}
