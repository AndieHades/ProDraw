import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import {
  BRUSH_STUDIO_SECTIONS, type BrushStudioSectionId
} from "../../config/brushStudio";
import { cloneBrushPreset } from "../../logic/brush/cloneBrushPreset";
import { t, type MessageKey } from "../../i18n/raster/translate";
import {
  updateBrushValue, type BrushScalarValue
} from "../../logic/brush/brushStudioValues";
import { requiredElement } from "../dom/query";
import { BrushControlPresenter } from "./BrushControlPresenter";
import { BrushStudioPad } from "./BrushStudioPad";

export class BrushStudioPresenter {
  readonly #dialog = requiredElement<HTMLDialogElement>("#brush-studio-dialog");
  readonly #name = requiredElement<HTMLElement>("#studio-brush-name");
  readonly #sections = requiredElement<HTMLElement>("#studio-sections");
  readonly #diagnostics = requiredElement<HTMLElement>("#stylus-diagnostics");
  readonly #controls = new BrushControlPresenter(
    requiredElement<HTMLElement>("#studio-controls")
  );
  readonly #pad: BrushStudioPad;
  readonly #load: (brush: BrushPreset) => Promise<LoadedBrush>;
  readonly #onApply: (source: BrushPreset, draft: BrushPreset) => Promise<void>;
  #source: BrushPreset | null = null;
  #draft: BrushPreset | null = null;
  #loaded: LoadedBrush | null = null;
  #openRequest = 0;
  #section: BrushStudioSectionId = "strokePath";

  constructor(load: (brush: BrushPreset) => Promise<LoadedBrush>,
    onApply: (source: BrushPreset, draft: BrushPreset) => Promise<void>) {
    this.#load = load;
    this.#onApply = onApply;
    this.#pad = new BrushStudioPad(requiredElement("#studio-pad"),
      () => this.renderingBrush(), (sample) => {
        this.#diagnostics.textContent = `${t("studio.pressure")} ${sample.pressure.toFixed(2)} · ` +
          `${t("studio.tilt")} ${sample.tiltX}° / ${sample.tiltY}° · ` +
          `${t("studio.buttons")} ${sample.buttons}`;
      });
    requiredElement("#studio-apply").addEventListener("click", () => void this.apply());
  }

  open(brush: BrushPreset): void {
    const request = ++this.#openRequest;
    this.#source = brush;
    this.#draft = cloneBrushPreset(brush);
    this.#loaded = null;
    this.#section = "strokePath";
    this.#dialog.showModal();
    this.render();
    requestAnimationFrame(() => this.#pad.resetPreview());
    void this.#load(brush).then((loaded) => {
      if (request !== this.#openRequest || this.#source?.id !== loaded.id) return;
      this.#draft = cloneBrushPreset(loaded);
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
    });
  }

  private updateDraft(path: string, value: BrushScalarValue): void {
    this.#draft = updateBrushValue(this.requiredDraft(), path, value);
    if (path === "name") this.#name.textContent = this.#draft.name;
    this.#pad.resetPreview();
  }

  private async apply(): Promise<void> {
    const source = this.#source;
    const draft = this.#draft;
    if (!source || !draft) return;
    const button = requiredElement<HTMLButtonElement>("#studio-apply");
    button.disabled = true;
    try {
      await this.#onApply(source, draft);
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
    return loaded ? { ...draft, shapeMap: loaded.shapeMap, grainMap: loaded.grainMap,
      compatibility: loaded.compatibility, warnings: loaded.warnings } : draft;
  }
}
