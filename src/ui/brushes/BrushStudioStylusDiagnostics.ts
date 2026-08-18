import type { StylusDiagnosticSample } from "../../contracts/stroke";
import { t } from "../../i18n/raster/translate";

export function stylusDiagnosticText(sample: StylusDiagnosticSample): string {
  const input = t(`studio.input.${sample.pointerType}`);
  const pressure = sample.pointerType === "mouse"
    ? `${t("studio.pressure")} — (${t("studio.pressureUnavailable")})`
    : `${t("studio.pressure")} ${sample.rawPressure.toFixed(2)}`;
  return `${t("studio.input")} ${input} · ${pressure} · ` +
    `${t("studio.tilt")} ${sample.tiltX}° / ${sample.tiltY}° · ` +
    `${t("studio.buttons")} ${sample.buttons}`;
}

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
      this.#element.textContent = stylusDiagnosticText(latest);
    });
  }
}
