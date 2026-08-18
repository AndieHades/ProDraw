import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import type { PlatformPort } from "../../contracts/platform";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";
import { compactBrushTile, disposeCompactBrushTile } from "./CompactBrushTile";
import { mountCompactBrushPanel } from "./mountCompactBrushPanel";
import { BrushPreviewQueue } from "./BrushPreviewQueue";
import type { CompactBrushShellPort } from "./CompactBrushShellPort";
import { BrushPreviewCache } from "../../core/brush/BrushPreviewCache";
import { preferredBrush } from "../../logic/brush/preferredBrush";
export interface CompactBrushActions {
  readonly edit: (brush: BrushPreset) => void;
  readonly select: (brush: BrushPreset, loaded: LoadedBrush, mode: string) => void;
  readonly load: (brush: BrushPreset) => Promise<LoadedBrush>;
}
export class CompactBrushLibraryPresenter {
  readonly #panel = requiredElement<HTMLElement>("#brush-pop");
  readonly #list = requiredElement<HTMLElement>("#brush-list");
  readonly #menu = requiredElement<HTMLElement>("#brush-menu");
  readonly #library: BrushLibraryPort;
  readonly #platform: PlatformPort;
  readonly #shell: CompactBrushShellPort;
  readonly #previews = new BrushPreviewQueue();
  readonly #previewCache = new BrushPreviewCache();
  readonly #actions: CompactBrushActions; #activeId: string | null;
  #menuBrush: BrushPreset | null = null;
  #mode = "pencil";
  #renderKey = ""; #opened = false;
  constructor(library: BrushLibraryPort, platform: PlatformPort,
    shell: CompactBrushShellPort,
    brushActions: CompactBrushActions) {
    this.#library = library; this.#platform = platform; this.#shell = shell;
    this.#actions = brushActions;
    this.#previews.pause();
    const requested = library.snapshot.activeBrushId; this.#activeId = this.brushes()
      .some(({ id }) => id === requested) ? requested : preferredBrush(this.brushes())?.id ?? null;
    library.subscribe(() => { if (this.#opened) this.refresh(); });
    shell.registerOpen((mode) => this.toggle(mode));
    this.#menu.addEventListener("click", (event) => void this.runMenu(event));
    requiredElement("#confirm-delete-brush").addEventListener("click", () =>
      void this.deleteCurrent());
    requiredElement("#brush-add").addEventListener("click", (event) => this.openAdd(event));
    requiredElement("#brush-import").addEventListener("click", () => void this.importBrush());
    requiredElement("#brush-export").addEventListener("click", () => void this.exportBrush());
    requiredElement("#brush-from-sel").addEventListener("click", () => void this.createBrush());
    mountCompactBrushPanel(shell, this.#panel, this.#menu, () => this.close());
    const initial = this.brushes().find(({ id }) => id === this.#activeId);
    if (initial) void this.activate(initial, "pencil");
  }
  select(brush: BrushPreset): void { this.choose(brush); }
  private brushes(): BrushPreset[] { return this.#library.snapshot.sets
    .flatMap(({ brushes }) => brushes); }
  private render(): void {
    for (const tile of this.#list.querySelectorAll<HTMLElement>(".btile")) {
      disposeCompactBrushTile(tile);
    }
    this.#renderKey = this.brushes().map(({ id, revision, setName }) =>
      `${setName}/${id}@${revision}`).join("|");
    this.#list.replaceChildren(...this.brushes().map((brush) => compactBrushTile(brush,
      this.#activeId, { choose: (value) => this.choose(value),
        edit: (value) => { this.choose(value); this.#actions.edit(value); },
        menu: (value, event) => this.openMenu(value, event),
        reorder: (value, tile) => this.reorder(value, tile),
        load: this.#actions.load, shell: this.#shell, previews: this.#previews,
        cache: this.#previewCache } )));
  }
  private refresh(): void {
    const key = this.brushes().map(({ id, revision, setName }) =>
      `${setName}/${id}@${revision}`).join("|");
    if (key !== this.#renderKey) this.render();
    else this.syncSelection();
  }
  private syncSelection(): void {
    for (const tile of this.#list.querySelectorAll<HTMLElement>(".btile")) {
      tile.classList.toggle("on", tile.dataset.brushId === this.#activeId);
    }
  }
  private toggle(mode: string): void {
    this.#mode = mode;
    const opening = !this.#panel.classList.contains("on");
    this.#panel.classList.toggle("on", opening);
    if (opening) { this.#opened = true; this.#previews.resume(); this.refresh(); }
    else this.close();
  }
  private close(): void {
    this.#opened = false; this.#panel.classList.remove("on"); this.#previews.pause();
  }
  private choose(brush: BrushPreset): void {
    this.#activeId = brush.id; this.syncSelection(); this.#library.markRecent(brush.id);
    const mode = this.#mode; void this.activate(brush, mode);
  }
  private async activate(brush: BrushPreset, mode: string): Promise<void> {
    const loaded = await this.#previews.runForeground(() => this.#actions.load(brush));
    if (this.#activeId === brush.id) this.#actions.select(brush, loaded, mode);
  }
  private openMenu(brush: BrushPreset, event: PointerEvent): void {
    this.#menuBrush = brush;
    this.#shell.showMenu(this.#menu, event.clientX, event.clientY, true);
  }
  private async runMenu(event: Event): Promise<void> {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.act;
    const brush = this.#menuBrush; this.#menu.classList.remove("on");
    if (!brush) return;
    if (action === "edit") this.#actions.edit(brush);
    if (action === "duplicate") this.select(await this.#library.duplicate(brush,
      `${brush.name} — ${t("brush.copySuffix")}`));
    if (action === "delete") {
      requiredElement("#delete-brush-message").textContent =
        `${t("brush.deletePrompt")} ${brush.name}`;
      requiredElement<HTMLDialogElement>("#delete-brush-dialog").showModal();
    }
  }
  private async deleteCurrent(): Promise<void> {
    const brush = this.#menuBrush; if (!brush) return;
    await this.#library.delete(brush);
    requiredElement<HTMLDialogElement>("#delete-brush-dialog").close();
    const fallback = preferredBrush(this.brushes()); this.#activeId = fallback?.id ?? null;
    if (fallback) this.choose(fallback);
  }
  private reorder(brush: BrushPreset, tile: HTMLElement): void {
    let next = tile.nextElementSibling as HTMLElement | null;
    while (next && next.dataset.brushSet !== brush.setName) {
      next = next.nextElementSibling as HTMLElement | null;
    }
    this.#library.reorderBrush(brush.setName, brush.id, next?.dataset.brushId ?? null);
  }
  private openAdd(event: Event): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.#shell.showMenu(requiredElement("#brush-plus"), bounds.left, bounds.bottom);
  }
  private async createBrush(): Promise<void> {
    requiredElement("#brush-plus").classList.remove("on");
    const source = this.brushes().find(({ id }) => id === this.#activeId) ?? this.brushes()[0];
    if (source) { const created = await this.#library.create(source, t("brush.untitled"));
      this.select(created); this.#actions.edit(created); }
  }
  private async importBrush(): Promise<void> {
    requiredElement("#brush-plus").classList.remove("on");
    const file = await this.#platform.openBinary([{ name: "Procreate Brush",
      extensions: ["brush", "prodraw-brush"] }]);
    if (file) this.select(await this.#library.importFile(file.name, file.bytes));
  }
  private async exportBrush(): Promise<void> {
    requiredElement("#brush-plus").classList.remove("on");
    const brush = this.brushes().find(({ id }) => id === this.#activeId); if (!brush) return;
    const file = await this.#library.exportFile(brush);
    await this.#platform.saveBinary({ suggestedName: file.name, bytes: file.bytes });
  }
}
