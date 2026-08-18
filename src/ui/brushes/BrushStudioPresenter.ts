import type {
  BrushPreset, BrushSourceAsset, BrushSourceKind, LoadedBrush
} from "../../contracts/brush";
import {
  BRUSH_STUDIO_SECTIONS, type BrushStudioSectionId
} from "../../config/brushStudio";
import { cloneBrushPreset } from "../../logic/brush/cloneBrushPreset";
import {
  effectiveBrushSources, selectBrushSource
} from "../../logic/brush/brushSourceAsset";
import { t, type MessageKey } from "../../i18n/raster/translate";
import {
  updateBrushValue, type BrushScalarValue
} from "../../logic/brush/brushStudioValues";
import { requiredElement } from "../dom/query";
import { BrushControlPresenter } from "./BrushControlPresenter";
import { BrushStudioPad } from "./BrushStudioPad";
import { BrushStudioStylusDiagnostics } from "./BrushStudioStylusDiagnostics";
import { BrushStudioTracePresenter } from "./BrushStudioTracePresenter";
import { BrushSourceLibraryPresenter } from "./BrushSourceLibraryPresenter";
import {
  BrushShortcutField, noBrushShortcuts, type BrushShortcutPort
} from "./BrushShortcutField";

export class BrushStudioPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-studio-dialog");
  readonly #name = requiredElement<HTMLElement>("#studio-brush-name");
  readonly #sections = requiredElement<HTMLElement>("#studio-sections");
  readonly #diagnostics = new BrushStudioStylusDiagnostics(
    requiredElement<HTMLElement>("#stylus-diagnostics"));
  readonly #controls: BrushControlPresenter;
  readonly #pad: BrushStudioPad;
  readonly #sourceLibrary: BrushSourceLibraryPresenter;
  readonly #shortcutField = new BrushShortcutField(
    requiredElement<HTMLInputElement>("#studio-brush-shortcut"));
  readonly #load: (brush: BrushPreset) => Promise<LoadedBrush>;
  readonly #onApply: (source: BrushPreset, draft: BrushPreset) => Promise<void>;
  readonly #shortcuts: BrushShortcutPort;
  #source: BrushPreset | null = null;
  #draft: BrushPreset | null = null;
  #loaded: LoadedBrush | null = null;
  #openRequest = 0;
  #draftVersion = 0;
  #section: BrushStudioSectionId = "strokePath";

  constructor(getBrushes: () => readonly BrushPreset[],
    load: (brush: BrushPreset) => Promise<LoadedBrush>,
    onApply: (source: BrushPreset, draft: BrushPreset) => Promise<void>,
    saveTrace: (name: string, bytes: Uint8Array<ArrayBuffer>) => Promise<boolean>,
    shortcuts: BrushShortcutPort = noBrushShortcuts) {
    this.#load = load;
    this.#onApply = onApply;
    this.#shortcuts = shortcuts;
    this.#controls = new BrushControlPresenter(requiredElement("#studio-controls"),
      (kind) => this.openSource(kind));
    this.#sourceLibrary = new BrushSourceLibraryPresenter(getBrushes, load);
    this.#pad = new BrushStudioPad(requiredElement("#studio-pad"),
      () => this.renderingBrush(), (sample) => this.#diagnostics.show(sample));
    new BrushStudioTracePresenter(requiredElement("#studio-pad"),
      () => this.renderingBrush(), saveTrace);
    requiredElement("#studio-apply").addEventListener("click", () => void this.apply());
  }

  open(brush: BrushPreset): void {
    const request = ++this.#openRequest;
    this.#source = brush;
    this.#draft = cloneBrushPreset(brush);
    this.#loaded = null;
    this.#draftVersion = 0;
    this.#section = "strokePath";
    this.#shortcutField.set(this.#shortcuts.read(brush.id));
    this.#dialog.showModal();
    this.render();
    requestAnimationFrame(() => this.#pad.resetPreview());
    void this.#load(brush).then((loaded) => {
      if (request !== this.#openRequest || this.#source?.id !== loaded.id) return;
      if (this.#draftVersion === 0) this.#draft = cloneBrushPreset(loaded);
      this.#loaded = loaded;
      this.render();
      this.#pad.resetPreview();
    });
  }

  private render(): void {
    const draft = this.requiredDraft();
    this.#name.textContent = draft.name;
    this.#sections.replaceChildren(...BRUSH_STUDIO_SECTIONS.map((section) => {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("selected", section.id === this.#section);
      button.textContent = t(section.labelKey as MessageKey);
      button.addEventListener("click", () => {
        this.#section = section.id;
        this.render();
      });
      return button;
    }));
    this.#controls.render(this.#section, this.renderingBrush(), (path, value) => {
      this.updateDraft(path, value);
    }, () => this.render());
  }

  private updateDraft(path: string, value: BrushScalarValue): void {
    this.#draftVersion += 1;
    this.#draft = updateBrushValue(this.requiredDraft(), path, value);
    if (path === "name") this.#name.textContent = this.#draft.name;
    this.#pad.resetPreview();
  }

  private openSource(kind: BrushSourceKind): void {
    this.#sourceLibrary.open(kind, (selectedKind, asset) =>
      this.selectSource(selectedKind, asset));
  }

  private selectSource(kind: BrushSourceKind, asset: BrushSourceAsset): void {
    this.#draftVersion += 1;
    this.#draft = selectBrushSource(this.requiredDraft(), kind, asset);
    this.render(); this.#pad.resetPreview();
  }

  private async apply(): Promise<void> {
    const source = this.#source;
    const draft = this.#draft;
    if (!source || !draft) return;
    const button = requiredElement<HTMLButtonElement>("#studio-apply");
    button.disabled = true;
    try {
      await this.#onApply(source, draft);
      await this.#shortcuts.write(source.id, this.#shortcutField.value || null);
      this.#dialog.close();
    } finally {
      button.disabled = false;
    }
  }

  private requiredDraft(): BrushPreset {
    if (!this.#draft) throw new Error("Brush Studio has no draft");
    return this.#draft;
  }

  private renderingBrush(): BrushPreset | LoadedBrush {
    const draft = this.requiredDraft();
    const loaded = this.#loaded;
    if (!loaded) return draft;
    return { ...loaded, ...draft, ...effectiveBrushSources(draft, loaded),
      nativeShapeMap: loaded.nativeShapeMap, nativeGrainMap: loaded.nativeGrainMap,
      compatibility: loaded.compatibility, warnings: loaded.warnings };
  }
}
