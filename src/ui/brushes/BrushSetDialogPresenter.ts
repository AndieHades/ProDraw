import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";

export class BrushSetDialogPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-set-dialog");
  readonly #input = requiredElement<HTMLInputElement>("#brush-set-name");
  readonly #error = requiredElement<HTMLElement>("#brush-set-error");
  readonly #library: BrushLibraryPort;
  #renaming: string | null = null;

  constructor(library: BrushLibraryPort) {
    this.#library = library;
    requiredElement("#add-brush-set").addEventListener("click", () => this.openCreate());
    requiredElement("#create-brush-set").addEventListener("click", () => void this.submit());
  }

  openRename(name: string): void {
    this.#renaming = name;
    this.open(name, "brush.renameSetTitle", "brush.rename");
  }

  private openCreate(): void {
    this.#renaming = null;
    this.open("", "brush.newSetTitle", "action.create");
  }

  private open(value: string, titleKey: "brush.renameSetTitle" | "brush.newSetTitle",
    actionKey: "brush.rename" | "action.create"): void {
    requiredElement("#brush-set-dialog-title").textContent = t(titleKey);
    requiredElement("#create-brush-set").textContent = t(actionKey);
    this.#input.value = value;
    this.#error.textContent = "";
    this.#dialog.showModal(); this.#input.select();
  }

  private async submit(): Promise<void> {
    try {
      if (this.#renaming) await this.#library.renameSet(this.#renaming, this.#input.value);
      else await this.#library.createSet(this.#input.value);
      this.#dialog.close();
    } catch {
      this.#error.textContent = t("brush.setNameRequired");
    }
  }
}
