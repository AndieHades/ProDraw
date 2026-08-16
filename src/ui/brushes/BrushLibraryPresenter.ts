import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibrarySnapshot } from "../../contracts/brushLibrary";
import type { BrushLibraryService } from "../../core/brush-library/BrushLibraryService";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";
import { BrushContextMenuPresenter } from "./BrushContextMenuPresenter";
import { renderBrushPreview } from "./renderBrushPreview";
import { BrushSetDialogPresenter } from "./BrushSetDialogPresenter";

export interface BrushLibraryActions {
  readonly select: (brush: BrushPreset) => void;
  readonly edit: (brush: BrushPreset) => void;
}

type SmartCollection = "recent" | "favorites" | null;

export class BrushLibraryPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-library-dialog");
  readonly #setList = requiredElement<HTMLElement>("#brush-set-list");
  readonly #list = requiredElement<HTMLDivElement>("#brush-list");
  readonly #library: BrushLibraryService;
  readonly #actions: BrushLibraryActions;
  readonly #context: BrushContextMenuPresenter;
  #snapshot: BrushLibrarySnapshot;
  #selectedId: string;
  #smart: SmartCollection = null;

  constructor(library: BrushLibraryService, selectedId: string, actions: BrushLibraryActions) {
    this.#library = library;
    this.#snapshot = library.snapshot;
    this.#selectedId = selectedId;
    this.#actions = actions;
    this.#context = new BrushContextMenuPresenter(library, {
      selected: (brush) => this.choose(brush),
      deleted: (brush) => this.afterDelete(brush)
    });
    library.subscribe((snapshot) => { this.#snapshot = snapshot; this.render(); });
    new BrushSetDialogPresenter(library);
    requiredElement("#add-brush").addEventListener("click", () => void this.createBrush());
  }

  open(): void {
    this.#dialog.showModal();
  }

  select(id: string): void {
    this.#selectedId = id;
    this.render();
  }

  private render(): void {
    this.renderSets();
    this.#list.replaceChildren(...this.collectionBrushes().map((brush) =>
      this.brushRow(brush)));
  }

  private renderSets(): void {
    const smart = [{ name: t("brush.recent"), id: "recent" as const },
      { name: t("brush.favorites"), id: "favorites" as const }];
    const smartButtons = smart.map(({ name, id }) => this.setButton(name,
      this.#smart === id, () => { this.#smart = id; this.render(); }));
    const setButtons = this.#snapshot.sets.map(({ name }) => this.setButton(name,
      !this.#smart && name === this.#snapshot.currentSetName, () => {
        this.#smart = null;
        this.#library.selectSet(name);
      }));
    this.#setList.replaceChildren(...smartButtons, ...setButtons);
  }

  private setButton(name: string, selected: boolean, activate: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.classList.toggle("selected", selected);
    button.addEventListener("click", activate);
    return button;
  }

  private collectionBrushes(): readonly BrushPreset[] {
    if (!this.#smart) return this.#snapshot.sets.find(({ name }) =>
      name === this.#snapshot.currentSetName)?.brushes ?? [];
    const ids = this.#smart === "recent"
      ? this.#snapshot.recentBrushIds : this.#snapshot.favoriteBrushIds;
    const byId = new Map(this.allBrushes().map((brush) => [brush.id, brush]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  private allBrushes(): BrushPreset[] {
    return this.#snapshot.sets.flatMap(({ brushes }) => brushes);
  }

  private brushRow(brush: BrushPreset): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `brush-row${brush.id === this.#selectedId ? " selected" : ""}`;
    const name = document.createElement("span");
    name.textContent = brush.name;
    const preview = document.createElement("canvas");
    preview.className = "brush-preview";
    renderBrushPreview(preview, brush);
    button.append(name, preview);
    button.addEventListener("click", () => this.choose(brush));
    button.addEventListener("dblclick", () => {
      this.choose(brush);
      this.#dialog.close();
      this.#actions.edit(brush);
    });
    button.addEventListener("contextmenu", (event) => {
      this.choose(brush);
      this.#context.open(event, brush);
    });
    return button;
  }

  private choose(brush: BrushPreset): void {
    this.#selectedId = brush.id;
    this.#library.markRecent(brush.id);
    this.#actions.select(brush);
  }

  private async createBrush(): Promise<void> {
    const source = this.allBrushes().find(({ id }) => id === this.#selectedId) ??
      this.allBrushes()[0];
    if (!source) return;
    const brush = await this.#library.create(source, t("brush.untitled"));
    this.choose(brush);
    this.#dialog.close();
    this.#actions.edit(brush);
  }

  private afterDelete(brush: BrushPreset): void {
    if (brush.id !== this.#selectedId) return;
    const fallback = this.allBrushes()[0];
    if (fallback) this.choose(fallback);
  }
}
