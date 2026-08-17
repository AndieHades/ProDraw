import type { StylusDiagnosticSample } from "../../contracts/stroke";
import { t } from "../../i18n/raster/translate";

export class BrushStudioStylusDiagnostics {
  readonly #element: HTMLElement;
  #latest: StylusDiagnosticSample | null = null;
  #frame: number | null = null;

  constructor(element: HTMLElement) { this.#element = element; }

  show(sample: StylusDiagnosticSample): void {
    this.#latest = sample;
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      const latest = this.#latest; if (!latest) return;
      this.#element.textContent = `${t("studio.pressure")} ${latest.pressure.toFixed(2)} · ` +
        `${t("studio.tilt")} ${latest.tiltX}° / ${latest.tiltY}° · ` +
        `${t("studio.buttons")} ${latest.buttons}`;
    });
  }
}
