import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibraryPort } from "../../contracts/brushLibraryPort";
import type { PlatformPort } from "../../contracts/platform";
import { t, type MessageKey } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";

export interface BrushFileActions {
  readonly selected: () => BrushPreset | null;
  readonly applySelection: (brush: BrushPreset) => void;
  readonly status: (key: MessageKey) => void;
}

export class BrushLibraryFilePresenter {
  readonly #library: BrushLibraryPort;
  readonly #platform: PlatformPort;
  readonly #actions: BrushFileActions;

  constructor(library: BrushLibraryPort, platform: PlatformPort, actions: BrushFileActions) {
    this.#library = library; this.#platform = platform; this.#actions = actions;
    this.bind("#import-brush", () => this.importBrush());
    this.bind("#export-brush", () => this.exportBrush());
    this.bind("#reset-brush", () => this.resetBrush());
    this.bind("#restore-brush-trash", () => this.restoreTrash());
    this.bind("#reveal-brush-folder", () => this.revealFolder());
  }

  private bind(selector: string, action: () => Promise<void>): void {
    const button = requiredElement<HTMLButtonElement>(selector);
    button.addEventListener("click", () => {
      button.disabled = true;
      void action().catch(() => this.#actions.status("status.brushFileFailed"))
        .finally(() => { button.disabled = false; });
    });
  }

  private async importBrush(): Promise<void> {
    const opened = await this.#platform.openBinary([
      { name: t("brush.fileFilter"), extensions: ["brush", "prodraw-brush"] }
    ]);
    if (!opened) return;
    const brush = await this.#library.importFile(opened.name, opened.bytes);
    this.#actions.applySelection(brush); this.#actions.status("status.brushImported");
  }

  private async exportBrush(): Promise<void> {
    const brush = this.#actions.selected();
    if (!brush) return;
    const exported = await this.#library.exportFile(brush);
    const extension = exported.name.endsWith(".brush") ? "brush" : "prodraw-brush";
    const saved = await this.#platform.saveBinary({ suggestedName: exported.name,
      bytes: exported.bytes, filters: [{ name: t("brush.fileFilter"), extensions: [extension] }] });
    if (saved) this.#actions.status("status.brushExported");
  }

  private async resetBrush(): Promise<void> {
    const brush = this.#actions.selected();
    if (!brush) return;
    this.#actions.applySelection(await this.#library.reset(brush));
    this.#actions.status("status.brushReset");
  }

  private async restoreTrash(): Promise<void> {
    await this.#library.restoreTrash(); this.#actions.status("status.brushTrashRestored");
  }

  private async revealFolder(): Promise<void> { await this.#library.revealFolder(); }
}
