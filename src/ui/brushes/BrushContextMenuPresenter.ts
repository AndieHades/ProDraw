import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";

export interface BrushContextActions {
  readonly selected: (brush: BrushPreset) => void;
  readonly deleted: (brush: BrushPreset) => void;
}

export class BrushContextMenuPresenter {
  readonly #menu = requiredElement<HTMLElement>("#brush-context-menu");
  readonly #deleteDialog = requiredElement<HTMLDialogElement>("#delete-brush-dialog");
  readonly #library: BrushLibraryPort;
  readonly #actions: BrushContextActions;
  #brush: BrushPreset | null = null;

  constructor(library: BrushLibraryPort, actions: BrushContextActions) {
    this.#library = library;
    this.#actions = actions;
    this.#menu.addEventListener("click", (event) => void this.run(event));
    requiredElement("#confirm-delete-brush").addEventListener("click", () =>
      void this.confirmDelete());
    document.addEventListener("pointerdown", (event) => {
      if (!this.#menu.contains(event.target as Node)) this.hide();
    }, true);
  }

  open(event: MouseEvent, brush: BrushPreset): void {
    event.preventDefault();
    this.#brush = brush;
    const favorite = requiredElement<HTMLButtonElement>(
      '#brush-context-menu [data-action="favorite"]'
    );
    favorite.textContent = t(this.#library.snapshot.favoriteBrushIds.includes(brush.id)
      ? "brush.unfavorite" : "brush.favorite");
    this.#menu.hidden = false;
    this.#menu.style.left = `${event.clientX}px`;
    this.#menu.style.top = `${event.clientY}px`;
  }

  private hide(): void {
    this.#menu.hidden = true;
  }

  private async run(event: Event): Promise<void> {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.action;
    const brush = this.#brush;
    this.hide();
    if (!brush) return;
    if (action === "favorite") this.#library.toggleFavorite(brush.id);
    if (action === "duplicate") {
      const copy = await this.#library.duplicate(brush,
        `${brush.name} — ${t("brush.copySuffix")}`);
      this.#actions.selected(copy);
    }
    if (action === "delete") {
      requiredElement("#delete-brush-message").textContent =
        `${t("brush.deletePrompt")} ${brush.name}`;
      this.#deleteDialog.showModal();
    }
  }

  private async confirmDelete(): Promise<void> {
    const brush = this.#brush;
    if (!brush) return;
    await this.#library.delete(brush);
    this.#deleteDialog.close();
    this.#brush = null;
    this.#actions.deleted(brush);
  }
}
