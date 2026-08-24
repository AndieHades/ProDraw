import { BP_SIZE_CURVE, BP_SMAX } from "../../config/limits.ts";
import { clamp01, clampRound } from "../../logic/math.ts";
import { nextFloatingZ } from "../windows/FloatingWindow.ts";

export interface SimpleDrawBarPort {
  readonly changed: () => void;
  readonly opacity: () => number;
  readonly redo: () => void;
  readonly setOpacity: (opacity: number) => void;
  readonly setSize: (size: number) => void;
  readonly size: () => number;
  readonly subscribe: (event: "eraser" | "tool", listener: () => void) => void;
  readonly undo: () => void;
}

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const clampSize = (value: number): number => clampRound(value, 1, BP_SMAX);
export const drawSizeFromFraction = (fraction: number): number =>
  clampSize(1 + Math.pow(clamp01(fraction), BP_SIZE_CURVE) * (BP_SMAX - 1));
export const drawFractionFromSize = (size: number): number =>
  Math.pow((clampSize(size) - 1) / (BP_SMAX - 1), 1 / BP_SIZE_CURVE);

export class SimpleDrawBarPresenter {
  #valueTimeout: number | null = null;
  readonly #port: SimpleDrawBarPort;
  constructor(port: SimpleDrawBarPort) { this.#port = port; }

  mount(): void {
    element("brushbar").addEventListener("pointerdown", () => {
      element("brushbar").style.zIndex = String(nextFloatingZ());
    }, true);
    this.bindSize(); this.bindOpacity();
    element<HTMLButtonElement>("bb-undo").onclick = this.#port.undo;
    element<HTMLButtonElement>("bb-redo").onclick = this.#port.redo;
    window.addEventListener("resize", () => this.sync());
    for (const event of ["tool", "eraser"] as const) this.#port.subscribe(event, () => this.sync());
    this.sync();
  }

  smaller(): void { this.setSize(this.#port.size() - 1); }
  bigger(): void { this.setSize(this.#port.size() + 1); }
  sync(): void {
    const fraction = drawFractionFromSize(this.#port.size()), knob = element("bp-size-knob");
    const slider = knob.parentElement; if (!slider) return;
    element("bp-size-fill").style.height = `${fraction * 100}%`;
    knob.style.bottom = `${Math.max(0, (slider.clientHeight - knob.offsetHeight) * fraction)}px`;
    const opacity = this.#port.opacity(), opacityKnob = element("bp-op-knob");
    const opacitySlider = opacityKnob.parentElement; if (!opacitySlider) return;
    element("bp-op-fill").style.height = `${opacity * 100}%`;
    opacityKnob.style.bottom = `${Math.max(0, (opacitySlider.clientHeight - opacityKnob.offsetHeight) * opacity)}px`;
  }

  private bindSize(): void {
    const slider = element("bp-size-sl"); let active = false;
    const update = (event: PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      this.setSize(drawSizeFromFraction(1 - (event.clientY - rect.top) / rect.height));
    };
    slider.addEventListener("pointerdown", (event) => { active = true; slider.setPointerCapture(event.pointerId); update(event); });
    slider.addEventListener("pointermove", (event) => { if (active) update(event); });
    slider.addEventListener("pointerup", () => { active = false; });
    slider.addEventListener("pointercancel", () => { active = false; });
  }

  private bindOpacity(): void {
    const slider = element("bp-op-sl"); let active = false;
    const update = (event: PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      this.#port.setOpacity(clamp01(1 - (event.clientY - rect.top) / rect.height));
      this.sync(); this.#port.changed();
    };
    slider.addEventListener("pointerdown", (event) => { active = true; slider.setPointerCapture(event.pointerId); update(event); });
    slider.addEventListener("pointermove", (event) => { if (active) update(event); });
    slider.addEventListener("pointerup", () => { active = false; });
    slider.addEventListener("pointercancel", () => { active = false; });
  }

  private setSize(size: number): void {
    const value = clampSize(size); this.#port.setSize(value); this.sync(); this.#port.changed();
    const label = element("bb-val"), rect = element("bp-size-sl").getBoundingClientRect();
    label.textContent = `${value} px`; label.style.left = `${rect.right + 8}px`;
    label.style.top = `${rect.top + rect.height / 2}px`; label.classList.add("on");
    if (this.#valueTimeout !== null) window.clearTimeout(this.#valueTimeout);
    this.#valueTimeout = window.setTimeout(() => label.classList.remove("on"), 700);
  }
}
