import { activeColorSnapshot } from "../core/state.ts";
import * as bus from "../core/bus.ts";
import { saveActiveColor } from "../core/color-prefs.ts";

export function mount(): void {
  const save = (): void => saveActiveColor(activeColorSnapshot());
  bus.on("color-sync", save); bus.on("palette", save);
}
