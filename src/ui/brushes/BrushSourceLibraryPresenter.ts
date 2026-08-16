import type {
  BrushPreset, BrushSourceAsset, BrushSourceKind, BrushSourceResource, LoadedBrush
} from "../../contracts/brush";
import { BrushSourceCatalog } from "../../core/brush/BrushSourceCatalog";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";
import { renderCoverageMap } from "./renderCoverageMap";

export class BrushSourceLibraryPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-source-dialog");
  readonly #shapeTab = requiredElement<HTMLButtonElement>("#source-tab-shape");
  readonly #grainTab = requiredElement<HTMLButtonElement>("#source-tab-grain");
  readonly #grid = requiredElement<HTMLElement>("#brush-source-grid");
  readonly #catalog = new BrushSourceCatalog();
  readonly #getBrushes: () => readonly BrushPreset[];
  readonly #load: (brush: BrushPreset) => Promise<LoadedBrush>;
  #kind: BrushSourceKind = "shape";
  #resources: readonly BrushSourceResource[] = [];
  #select: ((kind: BrushSourceKind, asset: BrushSourceAsset) => void) | null = null;
  #request = 0;

  constructor(getBrushes: () => readonly BrushPreset[],
    load: (brush: BrushPreset) => Promise<LoadedBrush>) {
    this.#getBrushes = getBrushes; this.#load = load;
    this.#shapeTab.addEventListener("click", () => this.changeKind("shape"));
    this.#grainTab.addEventListener("click", () => this.changeKind("grain"));
  }

  open(kind: BrushSourceKind,
    select: (kind: BrushSourceKind, asset: BrushSourceAsset) => void): void {
    this.#kind = kind; this.#select = select; this.#resources = [];
    const request = ++this.#request;
    this.#dialog.showModal(); this.render();
    void this.#catalog.collect(this.#getBrushes(), this.#load).then((resources) => {
      if (request !== this.#request) return;
      this.#resources = resources; this.render();
    });
  }

  private changeKind(kind: BrushSourceKind): void { this.#kind = kind; this.render(); }

  private render(): void {
    this.#shapeTab.classList.toggle("selected", this.#kind === "shape");
    this.#grainTab.classList.toggle("selected", this.#kind === "grain");
    const resources = this.#resources.filter(({ kind }) => kind === this.#kind);
    if (!resources.length) {
      const empty = document.createElement("p");
      empty.textContent = t(this.#resources.length ? "source.noneForKind" : "source.loading");
      this.#grid.replaceChildren(empty); return;
    }
    this.#grid.replaceChildren(...resources.map((resource) => this.card(resource)));
  }

  private card(resource: BrushSourceResource): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button"; button.className = "source-card";
    const canvas = document.createElement("canvas");
    renderCoverageMap(canvas, resource.map);
    const name = document.createElement("span"); name.textContent = resource.sourceBrushName;
    button.append(canvas, name);
    button.addEventListener("click", () => {
      this.#select?.(resource.kind, resource.asset); this.#dialog.close();
    });
    return button;
  }
}
