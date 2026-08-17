import { BP_SIZE_CURVE, BP_SMAX } from "../../config/limits.ts";
import { clamp01, clampRound } from "../../logic/math.ts";
import { nextFloatingZ } from "../windows/FloatingWindow.ts";

export interface BrushBarState { readonly opacity: number; readonly size: number }
export interface BrushBarPort {
  readonly brush: () => BrushBarState;
  readonly changed: () => void;
  readonly redo: () => void;
  readonly save: () => void;
  readonly setOpacity: (opacity: number) => void;
  readonly setSize: (size: number) => void;
  readonly subscribe: (event: "brush" | "brushlib" | "tool", listener: () => void) => void;
  readonly undo: () => void;
}

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing brush-bar element: ${id}`);
  return found as T;
};
const clampSize = (value: number): number => clampRound(value, 1, BP_SMAX);
export const sizeFromFrac = (fraction: number): number =>
  clampSize(1 + Math.pow(clamp01(fraction), BP_SIZE_CURVE) * (BP_SMAX - 1));
export const fracFromSize = (size: number): number =>
  Math.pow((clampSize(size) - 1) / (BP_SMAX - 1), 1 / BP_SIZE_CURVE);

function setVerticalSlider(fillId: string, knobId: string, fraction: number): void {
  const value = Math.max(0, Math.min(1, fraction));
  const knob = element(knobId);
  const slider = knob.parentElement;
  if (!slider) return;
  element(fillId).style.height = `${value * 100}%`;
  knob.style.bottom = `${Math.max(0, (slider.clientHeight - knob.offsetHeight) * value)}px`;
}

function bindVerticalSlider(id: string, onFraction: (fraction: number) => void): void {
  const slider = element(id);
  let active = false;
  const update = (event: PointerEvent): void => {
    const rect = slider.getBoundingClientRect();
    onFraction(Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height)));
  };
  slider.addEventListener("pointerdown", (event) => {
    active = true; slider.setPointerCapture(event.pointerId); update(event);
  });
  slider.addEventListener("pointermove", (event) => { if (active) update(event); });
  const end = (): void => { active = false; };
  slider.addEventListener("pointerup", end);
  slider.addEventListener("pointercancel", end);
}

export class BrushBarPresenter {
  readonly #port: BrushBarPort;
  #valueTimeout: number | null = null;

  constructor(port: BrushBarPort) { this.#port = port; }

  mount(): void {
    element("brushbar").addEventListener("pointerdown", () => {
      element("brushbar").style.zIndex = String(nextFloatingZ());
    }, true);
    bindVerticalSlider("bp-size-sl", (fraction) =>
      this.setSize(sizeFromFrac(fraction), true));
    bindVerticalSlider("bp-op-sl", (fraction) => {
      this.#port.setOpacity(Math.max(0, Math.min(1, fraction)));
      this.#port.save(); this.sync();
      this.showValue("bp-op-sl", `${Math.round(this.#port.brush().opacity * 100)}%`);
    });
    element<HTMLButtonElement>("bb-undo").onclick = this.#port.undo;
    element<HTMLButtonElement>("bb-redo").onclick = this.#port.redo;
    window.addEventListener("resize", () => this.sync());
    for (const event of ["tool", "brush", "brushlib"] as const) {
      this.#port.subscribe(event, () => this.sync());
    }
    this.sync();
  }

  smaller(): void { this.setSize(this.#port.brush().size - 1, true); }
  bigger(): void { this.setSize(this.#port.brush().size + 1, true); }

  sync(): void {
    const brush = this.#port.brush();
    setVerticalSlider("bp-size-fill", "bp-size-knob", fracFromSize(brush.size));
    setVerticalSlider("bp-op-fill", "bp-op-knob", brush.opacity);
  }

  private setSize(size: number, show = false): void {
    this.#port.setSize(clampSize(size));
    this.#port.save(); this.sync();
    if (show) this.showValue("bp-size-sl", `${this.#port.brush().size} px`);
    this.#port.changed();
  }

  private showValue(sliderId: string, text: string): void {
    const value = element("bb-val");
    const rect = element(sliderId).getBoundingClientRect();
    value.textContent = text;
    value.style.left = `${rect.right + 8}px`;
    value.style.top = `${rect.top + rect.height / 2}px`;
    value.classList.add("on");
    if (this.#valueTimeout !== null) window.clearTimeout(this.#valueTimeout);
    this.#valueTimeout = window.setTimeout(() => value.classList.remove("on"), 700);
  }
}
