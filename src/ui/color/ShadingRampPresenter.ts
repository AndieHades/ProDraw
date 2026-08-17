import { t } from "../../i18n/index.ts";
import { floatingWindow } from "../windows/FloatingWindow.ts";

type Rgb = readonly [number, number, number];
export interface ShadingRampViewModel {
  readonly colors: readonly Rgb[];
  readonly open: boolean;
  readonly picking: boolean;
}
export interface ShadingRampPort {
  readonly close: () => void;
  readonly enablePick: () => void;
  readonly reverse: () => void;
  readonly state: () => ShadingRampViewModel;
  readonly subscribe: (event: "locale" | "palette" | "tool",
    listener: (payload?: unknown) => void) => void;
}

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing shading element: ${id}`);
  return found as T;
};
const cssRgb = (color: Rgb): string => `rgb(${color[0]},${color[1]},${color[2]})`;
const hex = (color: Rgb): string => `#${color.map((value) =>
  value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export class ShadingRampPresenter {
  readonly #port: ShadingRampPort;
  constructor(port: ShadingRampPort) { this.#port = port; }

  mount(): void {
    this.syncTitle();
    floatingWindow(element("shade-pop"), { grip: element("shade-head"),
      handle: element("shade-rsz"), storeKey: "shadewin", minW: 160, minH: 70,
      onClose: this.#port.close,
      onResize: (width) => { element("shade-pop").style.width =
        `${Math.max(160, Math.min(innerWidth - 12, width))}px`; } });
    element<HTMLButtonElement>("shade-pick").onclick = this.#port.enablePick;
    this.#port.subscribe("locale", () => this.syncTitle());
    this.#port.subscribe("tool", (tool) => { if (tool !== "pencil") this.#port.close(); });
    this.#port.subscribe("palette", () => this.render());
    this.render();
  }

  render(): void {
    const box = element("shade-list");
    const state = this.#port.state();
    box.innerHTML = "";
    for (const color of state.colors) {
      const button = document.createElement("button");
      button.className = "shade-sw"; button.style.background = cssRgb(color);
      button.title = hex(color); button.onclick = this.#port.reverse;
      box.appendChild(button);
    }
    element("shade-pop").classList.toggle("on", state.open);
    element("shade-pick").classList.toggle("on", state.picking);
  }

  private syncTitle(): void { element("shade-title").textContent = t("shade.title"); }
}
