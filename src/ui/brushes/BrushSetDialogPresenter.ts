import type { BrushLibraryService } from "../../core/brush-library/BrushLibraryService";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";

export class BrushSetDialogPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-set-dialog");
  readonly #input = requiredElement<HTMLInputElement>("#brush-set-name");
  readonly #error = requiredElement<HTMLElement>("#brush-set-error");
  readonly #library: BrushLibraryService;

  constructor(library: BrushLibraryService) {
    this.#library = library;
    requiredElement("#add-brush-set").addEventListener("click", () => this.open());
    requiredElement("#create-brush-set").addEventListener("click", () => void this.create());
  }

  private open(): void {
    this.#input.value = "";
    this.#error.textContent = "";
    this.#dialog.showModal();
  }

  private async create(): Promise<void> {
    try {
      await this.#library.createSet(this.#input.value);
      this.#dialog.close();
    } catch {
      this.#error.textContent = t("brush.setNameRequired");
    }
  }
}
