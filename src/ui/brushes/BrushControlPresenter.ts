import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { BrushControlDefinition, BrushStudioSectionId } from
  "../../config/brushStudio";
import { BRUSH_STUDIO_CONTROLS } from "../../config/brushStudio";
import { t, type MessageKey } from "../../i18n/raster/translate";
import {
  readBrushValue, type BrushScalarValue
} from "../../logic/brush/brushStudioValues";

export class BrushControlPresenter {
  readonly #host: HTMLElement;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  render(
    section: BrushStudioSectionId,
    preset: BrushPreset | LoadedBrush,
    onChange: (path: string, value: BrushScalarValue) => void
  ): void {
    if (section === "about") {
      this.#host.replaceChildren(...this.about(preset));
      return;
    }
    if (section === "preview") {
      const hint = document.createElement("p");
      hint.textContent = t("studio.previewHint");
      this.#host.replaceChildren(hint);
      return;
    }
    const controls = BRUSH_STUDIO_CONTROLS[section] ?? [];
    this.#host.replaceChildren(...controls.map((control) =>
      this.control(control, preset, onChange)));
  }

  private about(preset: BrushPreset | LoadedBrush): HTMLElement[] {
    const lines: string[] = [t("studio.aboutHint")];
    if (!("compatibility" in preset)) lines.push(t("studio.aboutLoading"));
    else {
      const report = preset.compatibility;
      lines.push(`${t("studio.aboutArchive")}: ${report.archiveName ?? "—"} · ` +
        `v${report.archiveVersion ?? "—"}`);
      lines.push(`${t("studio.aboutSupported")}: ${report.supportedFields.length}`);
      if (report.unsupportedActiveFields.length) lines.push(
        `${t("studio.aboutUnsupported")}: ${report.unsupportedActiveFields.join(", ")}`);
      if (preset.warnings.length) lines.push(
        `${t("studio.aboutWarnings")}: ${preset.warnings.join(", ")}`);
      lines.push(t("studio.aboutExcluded"));
    }
    return lines.map((text) => {
      const paragraph = document.createElement("p"); paragraph.textContent = text; return paragraph;
    });
  }

  private control(
    definition: BrushControlDefinition,
    preset: BrushPreset,
    onChange: (path: string, value: BrushScalarValue) => void
  ): HTMLLabelElement {
    const label = document.createElement("label");
    label.className = "studio-control";
    const name = document.createElement("span");
    name.textContent = t(definition.labelKey as MessageKey);
    const output = document.createElement("output");
    const input = this.input(definition, readBrushValue(preset, definition.path));
    const sync = () => {
      const value = this.inputValue(input, definition);
      output.textContent = this.display(value, definition.display);
      onChange(definition.path, value);
    };
    input.addEventListener("input", sync);
    output.textContent = this.display(readBrushValue(preset, definition.path), definition.display);
    label.append(name, output, input);
    return label;
  }

  private input(definition: BrushControlDefinition, value: string | number | boolean): HTMLElement {
    if (definition.kind === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
      return input;
    }
    if (definition.kind === "select") {
      const select = document.createElement("select");
      for (const optionValue of definition.options ?? []) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = t(`control.action.${optionValue}` as MessageKey);
        select.append(option);
      }
      select.value = String(value);
      return select;
    }
    const input = document.createElement("input");
    input.type = definition.kind;
    if (definition.minimum !== undefined) input.min = String(definition.minimum);
    if (definition.maximum !== undefined) input.max = String(definition.maximum);
    if (definition.step !== undefined) input.step = String(definition.step);
    input.value = String(value);
    return input;
  }

  private inputValue(input: HTMLElement, definition: BrushControlDefinition) {
    if (input instanceof HTMLInputElement && definition.kind === "checkbox") return input.checked;
    if (input instanceof HTMLInputElement && definition.kind === "range") return Number(input.value);
    return (input as HTMLInputElement | HTMLSelectElement).value;
  }

  private display(value: string | number | boolean, display?: string): string {
    if (typeof value === "boolean") return value ? "✓" : "—";
    if (typeof value === "string") return value;
    if (display === "percent") return `${Math.round(value * 100)}%`;
    if (display === "degrees") return `${Math.round(value)}°`;
    if (display === "pixels") return `${Math.round(value * 10) / 10} px`;
    return String(Math.round(value * 100) / 100);
  }
}
