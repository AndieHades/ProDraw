import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";
import type { BrushSetDialogPresenter } from "./BrushSetDialogPresenter";

export class BrushSetContextMenuPresenter {
  readonly #menu = requiredElement<HTMLElement>("#brush-set-context-menu");
  readonly #deleteDialog = requiredElement<HTMLDialogElement>("#delete-brush-set-dialog");
  readonly #library: BrushLibraryPort;
  readonly #setDialog: BrushSetDialogPresenter;
  #setName: string | null = null;

  constructor(library: BrushLibraryPort, setDialog: BrushSetDialogPresenter) {
    this.#library = library; this.#setDialog = setDialog;
    requiredElement("#brush-set-list").addEventListener("contextmenu", (event) =>
      this.open(event as MouseEvent));
    this.#menu.addEventListener("click", (event) => void this.run(event));
    requiredElement("#confirm-delete-brush-set").addEventListener("click", () =>
      void this.confirmDelete());
    document.addEventListener("pointerdown", (event) => {
      if (!this.#menu.contains(event.target as Node)) this.hide();
    }, true);
  }

  private open(event: MouseEvent): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-set-name]");
    const name = button?.dataset.setName;
    if (!name) return;
    event.preventDefault(); this.#setName = name; this.#library.selectSet(name);
    this.#menu.querySelectorAll<HTMLButtonElement>("button")
      .forEach((item) => { item.disabled = name === "Main"; });
    this.#menu.hidden = false;
    this.#menu.style.left = `${event.clientX}px`;
    this.#menu.style.top = `${event.clientY}px`;
  }

  private hide(): void { this.#menu.hidden = true; }

  private run(event: Event): void {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.action;
    const name = this.#setName; this.hide();
    if (!name || name === "Main") return;
    if (action === "rename") this.#setDialog.openRename(name);
    if (action === "delete") {
      requiredElement("#delete-brush-set-message").textContent =
        `${t("brush.deleteSetPrompt")} ${name}`;
      this.#deleteDialog.showModal();
    }
  }

  private async confirmDelete(): Promise<void> {
    const name = this.#setName;
    if (!name || name === "Main") return;
    await this.#library.deleteSet(name);
    this.#deleteDialog.close(); this.#setName = null;
  }
}
